import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat, access, mkdtemp } from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const EXT_ZIP_ENV = process.env.YTMUSIC_EXTENSION_ZIP_PATH;
const EXT_DIR_ENV = process.env.YTMUSIC_EXTENSION_DIR_PATH;

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function candidateZipPaths() {
  const candidates = [];
  if (EXT_ZIP_ENV) candidates.push(EXT_ZIP_ENV);
  const cwd = process.cwd();
  candidates.push(path.resolve(cwd, 'YTMusic Test-5', 'extension.zip'));
  candidates.push(path.resolve(cwd, '..', 'YTMusic Test-5', 'extension.zip'));
  candidates.push(path.resolve(cwd, '..', '..', 'YTMusic Test-5', 'extension.zip'));
  return candidates;
}

function candidateExtensionDirs() {
  const candidates = [];
  if (EXT_DIR_ENV) candidates.push(EXT_DIR_ENV);
  const cwd = process.cwd();
  candidates.push(path.resolve(cwd, 'YTMusic Test-5', 'extension'));
  candidates.push(path.resolve(cwd, '..', 'YTMusic Test-5', 'extension'));
  candidates.push(path.resolve(cwd, '..', '..', 'YTMusic Test-5', 'extension'));
  return candidates;
}

async function findFirstExisting(paths) {
  for (const p of paths) {
    if (await pathExists(p)) return p;
  }
  return null;
}

async function zipDirectoryToTemp(dirPath) {
  const tmpBase = await mkdtemp(path.join(os.tmpdir(), 'ytm-ext-'));
  const zipPath = path.join(tmpBase, 'ytmusic-extension.zip');
  const child = spawn('zip', ['-r', '-q', zipPath, '.'], { cwd: dirPath });
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`zip exited with code ${code}`));
    });
  });
  await stat(zipPath);
  return zipPath;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try prebuilt zips in common locations
    const prebuilt = await findFirstExisting(candidateZipPaths());
    if (prebuilt) {
      const stats = await stat(prebuilt);
      const stream = createReadStream(prebuilt);
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Length': String(stats.size),
          'Content-Disposition': 'attachment; filename="ytmusic-extension.zip"',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Fallback: zip the extension dir on-the-fly from common locations
    const extDir = await findFirstExisting(candidateExtensionDirs());
    if (!extDir) {
      return NextResponse.json(
        {
          error: 'extension_missing',
          message: 'Extension source directory not found. Set YTMUSIC_EXTENSION_DIR_PATH or include YTMusic Test-5/extension.',
        },
        { status: 404 }
      );
    }

    const tmpZipPath = await zipDirectoryToTemp(extDir);
    const stats = await stat(tmpZipPath);
    const stream = createReadStream(tmpZipPath);
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(stats.size),
        'Content-Disposition': 'attachment; filename="ytmusic-extension.zip"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Failed to prepare extension zip:', err);
    return NextResponse.json(
      { error: 'extension_zip_error', message: 'Failed to prepare extension zip.' },
      { status: 500 }
    );
  }
}


