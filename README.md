# SLT-Nigate-1kyoku

バーチャル音楽部向けのリアルタイムパーティゲーム。出題者が4曲を出し、参加者は「実は苦手な1曲」を当てる。

Google Meet などの画面共有を想定したホスト画面と、スマホ参加用のプレイヤー画面がある。

元ネタ: [Google AI Studio アプリ](https://ai.studio/apps/d3a201db-928c-4a1a-bf7c-f1c6c7d3d81a)

## 遊び方

1. ホストがルームを作成し、画面を共有する
2. 参加者がルームコード（または QR）で入室する
3. 出題者が好き／苦手を混ぜた4曲と、苦手曲のエピソードを入力する
4. 参加者が投票し、開票 → 苦手曲の発表 → スコア加算
5. 出題者を交代して次ラウンド

## 技術

- フロント: React 19 / Vite / TypeScript / Tailwind CSS
- サーバ: Express + WebSocket（ルーム状態はメモリ上）
- パッケージマネージャ: bun（`bun.lock` あり）。npm でも起動可

## セットアップ

```bash
bun install
# または npm install
cp .env.example .env.local
```

`.env.local` の `GEMINI_API_KEY` は AI Studio 由来のプレースホルダです。現状のゲーム進行自体は WebSocket ルームで完結します。キーはコミットしないでください。

```bash
bun run dev
# または npm run dev
```

ブラウザで表示された URL を開き、ホストとしてルームを作る。

## Vercel

Hobby でも動くよう、ゲーム進行は WebSocket ではなく短い HTTP（参加・操作・0.8秒ごとの状態取得）です。API は `api/[[...path]].ts` の Express アプリです。

ルーム状態はプロセスメモリなので、インスタンスが分かれると同じコードでも別ルームになります。
