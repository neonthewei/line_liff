# LINE Accounting Bot

A LINE LIFF application for managing personal finances.

## Local Development

To test the application locally without LIFF redirection:

1. Make sure the `.env.local` file has the following configuration:

```
NEXT_PUBLIC_BYPASS_LIFF=true
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. To test a specific transaction, use URL parameters:

```
http://localhost:3000?id=14&type=expense
```

## Environment Variables

- `NEXT_PUBLIC_LIFF_ID`: Your LINE LIFF ID
- `NEXT_PUBLIC_BYPASS_LIFF`: Set to "true" to bypass LIFF initialization in development mode
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `NEXT_PUBLIC_SUPABASE_KEY`: Supabase API key

## Features

- View and edit transaction details
- Change transaction type (income/expense)
- Set fixed expenses with frequency (daily, weekly, monthly)
- Add notes to transactions
- Delete transactions

## LINE 聊天室通知功能

本應用程式支援在更新或刪除交易時，自動發送通知訊息到 LINE 聊天室。

### 啟用聊天室通知功能

要使用此功能，您需要在 LINE Developers 控制台中為 LIFF 應用啟用 `chat_message.write` 權限：

1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider
3. 選擇您的 LINE Login 頻道
4. 點擊 "LIFF" 標籤
5. 選擇您的 LIFF 應用
6. 在 "Scopes" 區域中，確保 `chat_message.write` 已勾選
7. 點擊 "Update" 按鈕保存設置

### 使用限制

請注意以下使用限制：

- 通知訊息只能發送到用戶打開 LIFF 應用的聊天室
- 必須在 LINE 應用內的 LIFF 瀏覽器中使用，不支援外部瀏覽器
- 用戶必須授予應用程式發送訊息的權限

### 分享功能

除了自動通知外，用戶還可以使用分享按鈕將交易資訊分享給好友或群組。
