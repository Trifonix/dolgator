#!/usr/bin/env python3
"""
Dolgator — вертикальное видео 720x1280 (Instagram Reels) по истории git.

Два режима (автоматически):
  1. Нет папки frames/ с кадрами → снимает кадры приложения
  2. frames/ + manifest.json есть → собирает MP4

Запуск:
    python make-demo-video/main.py --limit 5 --skip 92 --name dolgator-test-5
    python make-demo-video/main.py   # повторно — соберёт видео из frames/
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths & layout
# ---------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
WORK = HERE / ".work"
FRAMES = HERE / "frames"
COMPOSED = HERE / "composed"
MANIFEST = FRAMES / "manifest.json"

WIDTH, HEIGHT = 720, 1280
APP_H = int(HEIGHT * 0.9)   # 1152
FOOTER_H = HEIGHT - APP_H   # 128

PORT = 19088
WEB_URL = f"http://127.0.0.1:{PORT}"
SECONDS_PER_FRAME = 1.0
TITLE_SECONDS = 1.5
XFADE_SECONDS = 0.3
FPS = 30

IS_WIN = sys.platform == "win32"
NPM = "npm.cmd" if IS_WIN else "npm"
NPX = "npx.cmd" if IS_WIN else "npx"
STORAGE_KEY = "@dolgator/data"

ENV_EXPO = {
    **os.environ,
    "CI": "1",
    "BROWSER": "none",
    "EXPO_NO_TELEMETRY": "1",
    "EXPO_OFFLINE": "0",
}

BG = (8, 8, 14)
FOOTER_BG = (14, 14, 22)
TEXT = (236, 236, 244)
ACCENT = (120, 200, 180)
MUTED = (140, 140, 158)


# ---------------------------------------------------------------------------
# Demo state
# ---------------------------------------------------------------------------

def _date_key(d: datetime) -> str:
    return d.strftime("%Y-%m-%d")


def _monday(d: datetime) -> datetime:
    d = d.replace(hour=0, minute=0, second=0, microsecond=0)
    return d - timedelta(days=d.weekday())


def build_demo_state(now: datetime | None = None) -> dict:
    today = now or datetime.now()
    this_monday = _monday(today)
    prev_monday = this_monday - timedelta(days=7)
    template_ex = [[4, 4, 4, 4, 8], [5, 5, 5, 5, 12], [2, 2, 2, 2, 4]]
    template_sets = [[4, 5, 2], [4, 5, 2], [4, 5, 2], [4, 5, 2], [8, 12, 4]]
    template_meals = [250, 400, 500]
    days: dict = {}

    for i, delta in enumerate((0, 2, 4)):
        d = prev_monday + timedelta(days=delta)
        key = _date_key(d)
        jitter = i
        exercises = [
            [max(1, v + (1 if jitter and j == 4 else 0)) for j, v in enumerate(col)]
            for col in template_ex
        ]
        days[key] = {
            "date": key,
            "exercises": exercises,
            "exerciseSets": template_sets,
            "meals": [max(50, m + jitter * 10) for m in template_meals],
        }

    for i in range(7):
        d = prev_monday + timedelta(days=i)
        key = _date_key(d)
        if key not in days:
            meals = [max(50, m + (i - 3) * 10) for m in template_meals]
            days[key] = {"date": key, "meals": meals, "exerciseSets": [], "exercises": [[], [], []]}
        elif i not in (0, 2, 4):
            days[key]["meals"] = [max(50, m + (i - 3) * 10) for m in template_meals]

    today_key = _date_key(today)
    days[today_key] = {
        "date": today_key,
        "exercises": [[4, 4], [5], []],
        "exerciseSets": [[4, 5, 2], [4, 5, 2]],
        "meals": [260, 380],
    }

    return {
        "days": days,
        "lastExerciseRep": 8,
        "lastMealGrams": 400,
        "currentExerciseIndex": 1,
        "onboardingCompleted": True,
    }


# ---------------------------------------------------------------------------
# Git / processes
# ---------------------------------------------------------------------------

def run(
    args: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
    capture: bool = True,
    env: dict | None = None,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        check=check,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )


def git_log(repo: Path) -> list[tuple[str, str, str]]:
    out = run(
        ["git", "log", "--first-parent", "--reverse", "--pretty=format:%H\t%s\t%cI"],
        cwd=repo,
    ).stdout.strip()
    rows = []
    for line in out.splitlines():
        parts = line.split("\t", 2)
        if len(parts) == 3:
            rows.append((parts[0], parts[1], parts[2]))
    return rows


def short_subject(msg: str, limit: int = 48) -> str:
    msg = msg.strip().split("\n")[0]
    msg = re.sub(r"^Update version to [^,]+,?\s*", "", msg, flags=re.I)
    msg = re.sub(r"^Update version to \S+\s*", "", msg, flags=re.I)
    if len(msg) <= limit:
        return msg
    return msg[: limit - 1].rstrip() + "…"


def file_hash(path: Path) -> str:
    if not path.exists():
        return ""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def deps_fingerprint(work: Path) -> str:
    return file_hash(work / "package-lock.json") + file_hash(work / "package.json")


def ensure_worktree(repo: Path, first_sha: str) -> None:
    marker = WORK / ".git"
    if marker.exists() or marker.is_file():
        run(["git", "checkout", "--force", first_sha], cwd=WORK)
        run(["git", "clean", "-fdx", "-e", "node_modules", "-e", ".expo"], cwd=WORK, check=False)
        return
    if WORK.exists():
        shutil.rmtree(WORK, ignore_errors=True)
    run(["git", "worktree", "prune"], cwd=repo, check=False)
    run(["git", "worktree", "add", "--detach", str(WORK), first_sha], cwd=repo)


def checkout(sha: str) -> None:
    run(["git", "checkout", "--force", sha], cwd=WORK)
    run(["git", "clean", "-fdx", "-e", "node_modules", "-e", ".expo"], cwd=WORK, check=False)


def pids_on_port(port: int) -> list[int]:
    pids: set[int] = set()
    try:
        out = subprocess.check_output(["netstat", "-ano"], text=True, errors="replace")
    except (FileNotFoundError, subprocess.CalledProcessError):
        return []
    for line in out.splitlines():
        if f":{port}" not in line:
            continue
        if "LISTENING" not in line.upper() and "LISTEN" not in line.upper():
            continue
        bits = line.split()
        try:
            pids.add(int(bits[-1]))
        except ValueError:
            pass
    return [p for p in pids if p > 0]


def kill_port(port: int) -> None:
    for pid in pids_on_port(port):
        if IS_WIN:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
        else:
            try:
                os.kill(pid, signal.SIGTERM)
            except OSError:
                pass
    time.sleep(0.4)


def kill_proc(proc: subprocess.Popen | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    if IS_WIN:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
    else:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except OSError:
            proc.terminate()
    try:
        proc.wait(timeout=8)
    except subprocess.TimeoutExpired:
        proc.kill()
    kill_port(PORT)


def start_expo(*, clear: bool = False) -> subprocess.Popen:
    kill_port(PORT)
    kwargs: dict = {
        "cwd": str(WORK),
        "env": ENV_EXPO,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
        "text": True,
        "encoding": "utf-8",
        "errors": "replace",
    }
    if IS_WIN:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["preexec_fn"] = os.setsid
    cmd = [NPX, "expo", "start", "--web", "--port", str(PORT), "--non-interactive"]
    if clear:
        cmd.append("--clear")
    proc = subprocess.Popen(cmd, **kwargs)

    def _drain():
        try:
            for _line in proc.stdout or []:
                pass
        except Exception:
            pass

    threading.Thread(target=_drain, daemon=True).start()
    return proc


def wait_http(url: str, timeout: float = 120) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if 200 <= r.status < 500:
                    return True
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
            pass
        time.sleep(0.6)
    return False


def npm_install() -> None:
    print("  npm install ...", flush=True)
    run([NPM, "install", "--no-audit", "--no-fund"], cwd=WORK, capture=False)


# ---------------------------------------------------------------------------
# Frames manifest
# ---------------------------------------------------------------------------

def load_manifest() -> dict | None:
    if not MANIFEST.exists():
        return None
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


FRAME_RE = re.compile(r"^(\d{4})_([a-f0-9]{7,40})\.png$", re.I)


def list_frame_files() -> list[tuple[int, str, Path]]:
    found: list[tuple[int, str, Path]] = []
    for p in FRAMES.glob("*.png"):
        m = FRAME_RE.match(p.name)
        if m and p.stat().st_size >= 8000:
            found.append((int(m.group(1)), m.group(2), p))
    return sorted(found, key=lambda x: x[0])


def frames_ready() -> bool:
    return len(list_frame_files()) > 0


def resolve_frames_manifest() -> dict | None:
    """Собрать список кадров из PNG в папке + метаданные из manifest.json."""
    files = list_frame_files()
    if not files:
        return None
    base = load_manifest() or {}
    by_short = {c["short"]: c for c in base.get("commits", [])}
    commits: list[dict] = []
    for _idx, short, path in files:
        meta = by_short.get(
            short,
            {
                "sha": short,
                "short": short,
                "subject": short,
                "date": datetime.now().isoformat(timespec="seconds"),
            },
        )
        commits.append({**meta, "file": path.name})
    return {"name": base.get("name", "dolgator"), "commits": commits}


def save_manifest(name: str, commits: list[dict]) -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps({"name": name, "commits": commits}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def output_filename(name: str) -> Path:
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    safe = re.sub(r"[^\w\-]+", "-", name).strip("-") or "dolgator"
    return HERE / f"{stamp}_{safe}.mp4"


# ---------------------------------------------------------------------------
# Playwright capture
# ---------------------------------------------------------------------------

INJECT_JS = """
(state) => {
  const raw = JSON.stringify(state);
  try { localStorage.setItem("%s", raw); } catch (e) {}
  try { sessionStorage.setItem("%s", raw); } catch (e) {}
}
""" % (STORAGE_KEY, STORAGE_KEY)


def looks_like_onboarding(text: str) -> bool:
    return any(k in text for k in ("Добро пожаловать", "Использовать пример"))


def looks_like_error(text: str) -> bool:
    return any(
        k in text
        for k in (
            "Unable to resolve",
            "SyntaxError",
            "Module not found",
            "Unable to bundle",
            "There was a problem loading",
        )
    )


def capture_frame(page, dest: Path, state: dict) -> bool:
    from playwright.sync_api import TimeoutError as PwTimeout

    try:
        page.goto(WEB_URL, wait_until="domcontentloaded", timeout=90_000)
    except Exception:
        return False

    try:
        page.evaluate(INJECT_JS, state)
        page.reload(wait_until="domcontentloaded", timeout=90_000)
    except Exception:
        pass

    page.wait_for_timeout(2500)

    try:
        body = page.inner_text("body")
    except Exception:
        body = ""

    if looks_like_onboarding(body):
        try:
            page.evaluate(INJECT_JS, state)
            page.reload(wait_until="domcontentloaded", timeout=90_000)
            page.wait_for_timeout(2500)
            body = page.inner_text("body")
        except Exception:
            pass

    if looks_like_error(body) or not body.strip():
        try:
            page.wait_for_timeout(4000)
            body = page.inner_text("body")
        except PwTimeout:
            pass
        if looks_like_error(body) or not body.strip():
            return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(dest), full_page=False)
    return dest.exists() and dest.stat().st_size > 8000


def capture_frames(commits: list[tuple[str, str, str]], name: str, *, headed: bool) -> int:
    from playwright.sync_api import sync_playwright

    FRAMES.mkdir(parents=True, exist_ok=True)
    for old in FRAMES.glob("*.png"):
        old.unlink()
    if MANIFEST.exists():
        MANIFEST.unlink()

    ensure_worktree(REPO, commits[0][0])
    demo_state = build_demo_state()
    last_fp = ""
    expo: subprocess.Popen | None = None
    last_ok: Path | None = None
    manifest_rows: list[dict] = []

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=not headed)
            context = browser.new_context(
                viewport={"width": WIDTH, "height": APP_H},
                device_scale_factor=1,
                locale="ru-RU",
            )
            page = context.new_page()

            for i, (sha, subject, date_iso) in enumerate(commits):
                short = sha[:7]
                raw_png = FRAMES / f"{i:04d}_{short}.png"
                print(f"[{i + 1}/{len(commits)}] {short}  {short_subject(subject)}", flush=True)

                checkout(sha)
                fp = deps_fingerprint(WORK)
                if fp != last_fp or not (WORK / "node_modules").exists():
                    npm_install()
                    last_fp = fp
                    kill_proc(expo)
                    expo = None

                if expo is None or expo.poll() is not None:
                    expo = start_expo()
                    if not wait_http(WEB_URL, timeout=150):
                        print("  ! expo web failed", flush=True)
                        if last_ok:
                            shutil.copy2(last_ok, raw_png)
                        else:
                            continue
                else:
                    time.sleep(2.5)

                ok = capture_frame(page, raw_png, demo_state)
                if not ok:
                    print("  ! retry with --clear", flush=True)
                    kill_proc(expo)
                    expo = start_expo(clear=True)
                    wait_http(WEB_URL, timeout=150)
                    ok = capture_frame(page, raw_png, demo_state)
                if not ok:
                    print("  ! using previous frame", flush=True)
                    if last_ok:
                        shutil.copy2(last_ok, raw_png)
                    else:
                        continue
                last_ok = raw_png
                manifest_rows.append({
                    "sha": sha,
                    "short": short,
                    "subject": subject,
                    "date": date_iso,
                })

            context.close()
            browser.close()
    finally:
        kill_proc(expo)

    if not manifest_rows:
        return 0

    save_manifest(name, manifest_rows)
    print(f"Saved {len(manifest_rows)} frames -> {FRAMES}", flush=True)
    return len(manifest_rows)


# ---------------------------------------------------------------------------
# Compose & encode
# ---------------------------------------------------------------------------

def _font(size: int, bold: bool = False):
    from PIL import ImageFont

    if IS_WIN:
        windir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
        path = windir / ("segoeuib.ttf" if bold else "segoeui.ttf")
        if path.exists():
            return ImageFont.truetype(str(path), size)
    else:
        path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def _fit_contain(im, tw: int, th: int, bg=BG):
    from PIL import Image

    iw, ih = im.size
    scale = min(tw / iw, th / ih)
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (tw, th), bg)
    canvas.paste(im, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def _footer_line(date_iso: str, subject: str) -> str:
    try:
        dt = datetime.fromisoformat(date_iso.replace("Z", "+00:00"))
        date_s = dt.strftime("%d.%m.%Y")
    except ValueError:
        date_s = date_iso[:10]
    return f"{date_s}  ·  {short_subject(subject, limit=52)}"


def _truncate_to_width(text: str, font, max_w: int) -> str:
    from PIL import ImageDraw, Image

    if not text:
        return ""
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    if probe.textlength(text, font=font) <= max_w:
        return text
    ell = "…"
    lo, hi = 0, len(text)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        chunk = text[:mid].rstrip() + ell
        if probe.textlength(chunk, font=font) <= max_w:
            lo = mid
        else:
            hi = mid - 1
    return text[:lo].rstrip() + ell


def write_title_card(dest: Path) -> None:
    from PIL import Image, ImageDraw

    im = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(im)
    title = "Dolgator"
    font = _font(72, bold=True)
    tw = draw.textlength(title, font=font)
    draw.text(((WIDTH - tw) / 2, HEIGHT * 0.42), title, font=font, fill=TEXT)
    im.save(dest)


def compose_commit_frame(src: Path, dest: Path, date_iso: str, subject: str) -> None:
    from PIL import Image, ImageDraw

    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG)
    shot = Image.open(src).convert("RGB")
    app = _fit_contain(shot, WIDTH, APP_H)
    canvas.paste(app, (0, 0))

    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, APP_H, WIDTH, HEIGHT), fill=FOOTER_BG)
    draw.line((0, APP_H, WIDTH, APP_H), fill=(42, 42, 58), width=1)

    font = _font(22)
    line = _truncate_to_width(_footer_line(date_iso, subject), font, WIDTH - 32)
    tw = draw.textlength(line, font=font)
    draw.text(((WIDTH - tw) / 2, APP_H + (FOOTER_H - 22) // 2), line, font=font, fill=TEXT)
    canvas.save(dest)


def build_composed_frames(manifest: dict) -> list[Path]:
    COMPOSED.mkdir(parents=True, exist_ok=True)
    for old in COMPOSED.glob("*.png"):
        old.unlink()

    paths: list[Path] = []
    title = COMPOSED / "0000_title.png"
    write_title_card(title)
    paths.append(title)

    for i, c in enumerate(manifest["commits"]):
        src = FRAMES / c.get("file", f"{i:04d}_{c['short']}.png")
        out = COMPOSED / f"{i + 1:04d}.png"
        compose_commit_frame(src, out, c["date"], c["subject"])
        paths.append(out)

    return paths


def encode_with_xfade(frames: list[Path], durations: list[float], out: Path) -> None:
    """Плавные crossfade-переходы между сценами."""
    if len(frames) != len(durations):
        raise ValueError("frames/durations mismatch")
    if len(frames) == 1:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-loop", "1", "-t", str(durations[0]),
                "-i", str(frames[0]),
                "-vf", f"scale={WIDTH}:{HEIGHT},fps={FPS},format=yuv420p",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                str(out),
            ],
            check=True,
        )
        return

    # Сначала каждый кадр → короткий клип
    clips_dir = COMPOSED / "_clips"
    if clips_dir.exists():
        shutil.rmtree(clips_dir)
    clips_dir.mkdir()

    clip_paths: list[Path] = []
    for i, (png, dur) in enumerate(zip(frames, durations)):
        clip = clips_dir / f"clip_{i:03d}.mp4"
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-loop", "1", "-t", str(dur),
                "-i", str(png),
                "-vf", f"scale={WIDTH}:{HEIGHT},fps={FPS},format=yuv420p",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                str(clip),
            ],
            check=True,
            capture_output=True,
        )
        clip_paths.append(clip)

    # Цепочка xfade
    fade = XFADE_SECONDS
    n = len(clip_paths)
    inputs = []
    for p in clip_paths:
        inputs += ["-i", str(p)]

    # offset_i = sum(durations[:i]) - i * fade
    parts: list[str] = []
    prev = "[0:v]"
    for i in range(1, n):
        offset = sum(durations[:i]) - i * fade
        nxt = f"[v{i}]" if i < n - 1 else "[vout]"
        parts.append(
            f"{prev}[{i}:v]xfade=transition=fade:duration={fade}:offset={offset:.3f}{nxt}"
        )
        prev = nxt

    filter_complex = ";".join(parts)
    total_dur = sum(durations) - (n - 1) * fade

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-t", f"{total_dur:.3f}",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def compose_video(manifest: dict, out: Path | None = None) -> Path:
    name = manifest.get("name", "dolgator")
    dest = out or output_filename(name)
    frames = build_composed_frames(manifest)
    durations = [TITLE_SECONDS] + [SECONDS_PER_FRAME] * (len(frames) - 1)
    print(f"Encoding {len(frames)} scenes -> {dest}", flush=True)
    encode_with_xfade(frames, durations, dest)
    print(f"Done: {dest}", flush=True)
    return dest


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def select_commits(skip: int, limit: int) -> list[tuple[str, str, str]]:
    commits = git_log(REPO)
    if skip:
        commits = commits[skip:]
    if limit:
        commits = commits[:limit]
    return commits


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, OSError):
            pass

    parser = argparse.ArgumentParser(description="Dolgator Reels 720x1280 demo video")
    parser.add_argument("--limit", type=int, default=0, help="N commits")
    parser.add_argument("--skip", type=int, default=0, help="skip first N commits")
    parser.add_argument("--name", type=str, default="dolgator", help="base name for output mp4")
    parser.add_argument("--headed", action="store_true", help="show Chromium")
    parser.add_argument("--force-capture", action="store_true", help="recapture even if frames exist")
    parser.add_argument("--force-video", action="store_true", help="build video even if no frames")
    args = parser.parse_args()

    if frames_ready() and not args.force_capture:
        manifest = resolve_frames_manifest()
        if manifest is None:
            print("No frames found.", file=sys.stderr)
            return 1
        print(f"Mode: VIDEO ({len(manifest['commits'])} frames in {FRAMES})", flush=True)
        if not shutil.which("ffmpeg"):
            print("ffmpeg required.", file=sys.stderr)
            return 1
        compose_video(manifest)
        return 0

    # Capture mode
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError:
        print("Install: python -m pip install -r make-demo-video/requirements.txt", file=sys.stderr)
        return 1

    commits = select_commits(args.skip, args.limit)
    if not commits:
        print("No commits.", file=sys.stderr)
        return 1

    print(f"Mode: CAPTURE ({len(commits)} commits) -> {FRAMES}", flush=True)
    n = capture_frames(commits, args.name, headed=args.headed)
    if n == 0:
        return 1
    print("Frames ready. Run again to build video.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
        raise SystemExit(130)
