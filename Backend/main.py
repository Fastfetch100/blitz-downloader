from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import io
import tempfile
import os

# --- 🔥 HARDCODED FFMPEG PATH (FOUND ON YOUR SYSTEM) ---
FFMPEG_LOCATION = r"C:\Users\krieg\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffmpeg.exe"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/download")
async def download_video(url: str = Query(...), format: str = Query("MP3"), quality: str = Query("320kbps")):
    # Base options with the forced FFmpeg location
    ydl_opts = {
        'quiet': False,  # Set to False so we can see logs
        'ffmpeg_location': FFMPEG_LOCATION,  # <--- THIS IS THE FIX
    }
    
    if format == "MP3":
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': quality.replace('kbps', ''),
            }],
        })
        filename_template = '%(title)s.%(ext)s'
    else:
        height_map = {
            "2160P (4K)": "2160",
            "1080P": "1080",
            "720P": "720",
            "480P": "480"
        }
        height = height_map.get(quality, "720")
        ydl_opts.update({
            'format': f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={height}][ext=mp4]',
            'merge_output_format': 'mp4',
        })
        filename_template = '%(title)s.%(ext)s'

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            ydl_opts['outtmpl'] = os.path.join(tmpdir, filename_template)
            print(f"📁 Downloading to {tmpdir}")
            print(f"🔧 Using FFmpeg at: {FFMPEG_LOCATION}")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'video')
                print(f"✅ Download complete: {title}")
            
            downloaded_files = os.listdir(tmpdir)
            if downloaded_files:
                file_path = os.path.join(tmpdir, downloaded_files[0])
                file_size = os.path.getsize(file_path)
                print(f"📊 File size: {file_size} bytes")
                
                if file_size == 0:
                    return {"error": "Downloaded file is empty"}
                
                ext = os.path.splitext(file_path)[1][1:]
                media_type = "audio/mpeg" if ext == "mp3" else "video/mp4"
                
                with open(file_path, "rb") as f:
                    file_data = f.read()
                
                return StreamingResponse(
                    io.BytesIO(file_data),
                    media_type=media_type,
                    headers={"Content-Disposition": f'attachment; filename="{title}.{ext}"'}
                )
            else:
                return {"error": "No files downloaded"}
                
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return {"error": str(e)}