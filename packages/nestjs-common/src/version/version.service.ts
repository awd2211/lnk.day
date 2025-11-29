import { Injectable } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit: string;
  nodeVersion: string;
}

@Injectable()
export class VersionService {
  private readonly versionInfo: VersionInfo;

  constructor() {
    this.versionInfo = this.loadVersionInfo();
  }

  private loadVersionInfo(): VersionInfo {
    // Try to read version from package.json
    let version = '0.0.0';

    // Look for package.json in common locations
    const possiblePaths = [
      join(process.cwd(), 'package.json'),
      join(process.cwd(), '..', 'package.json'),
    ];

    for (const packagePath of possiblePaths) {
      if (existsSync(packagePath)) {
        try {
          const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
          version = pkg.version || '0.0.0';
          break;
        } catch {
          // Continue to next path
        }
      }
    }

    return {
      version,
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      nodeVersion: process.version,
    };
  }

  getVersion(): string {
    return this.versionInfo.version;
  }

  getVersionInfo(): VersionInfo {
    return this.versionInfo;
  }
}
