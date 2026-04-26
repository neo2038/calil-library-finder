#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// .env を手動パース（外部依存なし）
const envPath = path.join(root, '.env');
const env = {};

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    });
}

// 環境変数（CI/GitHub Actions）を優先
const appkey = process.env.CALIL_APPKEY || env.CALIL_APPKEY || '';

if (!appkey) {
  console.error('Error: CALIL_APPKEY が設定されていません。.env ファイルを確認してください。');
  process.exit(1);
}

const config = `// This file is auto-generated. Do not edit or commit.\nwindow.__ENV__ = ${JSON.stringify({ CALIL_APPKEY: appkey })};\n`;

fs.writeFileSync(path.join(root, 'config.js'), config);
console.log('config.js を生成しました。');
