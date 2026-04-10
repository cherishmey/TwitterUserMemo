# Twitter User Memo

Leave private memos on any X (Twitter) profile. Your notes stay synced across devices via Chrome storage - no servers, no accounts, no external APIs.

## Features

- Add memos to any user profile page
- Quick memo on hover cards (collapsed by default, expand with one click)
- Memos sync across your Chrome instances via `chrome.storage.sync`
- Light and dark theme support (auto-detects X theme)
- Bilingual: English and Korean UI
- Zero external API calls - all data stays local
- Manifest V3 compliant

## How It Works

The extension injects a memo box into profile pages on `x.com` and `twitter.com`, plus a compact memo toggle inside user hover cards.

All memos are stored in `chrome.storage.sync` using the user's screen name as the key:

```json
{
  "@username": {
    "memo": "Private note text",
    "updatedAt": 1712345678901
  }
}
```

This means:

- Notes are private to the browser profile that installed the extension
- Notes can sync across Chrome instances signed into the same Chrome account
- Notes are not sent to any external server by this extension

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder.

## Usage

### Profile page memo

Open any X profile page. A **Memo** field appears below the profile header. Type anything you want, and the note is saved automatically after a short debounce.

### Hover card memo

Hover over a user to open their profile card. Click the memo toggle to expand the note area, then type. The memo is saved automatically and reused anywhere that account appears.

## Privacy

This extension does not use:

- Remote APIs
- Analytics
- Authentication
- External databases

All memo data lives inside Chrome extension storage.

## Theme Support

The UI adapts to X's current theme. The content script checks the page theme state and applies a scoped dark-mode class when needed.

## Project Structure

```text
manifest.json
README.md
css/
  main.css
js/
  background.js
  content.js
_locales/
  en/messages.json
  ko/messages.json
images/
  icon16.png
  icon48.png
  icon128.png
```

## Technical Notes

- Manifest V3 service worker is intentionally minimal
- One content script handles profile pages, hover cards, theme sync, and SPA navigation
- CSS is fully scoped with the `.x-memo-` prefix to avoid collisions with X styles
- Navigation is handled by listening to `pushState`, `replaceState`, and `popstate`

## Limitations

- The extension is designed for X profile surfaces and hover cards only
- DOM selectors may require updates if X significantly changes its internal markup
- `chrome.storage.sync` has Chrome quota limits, so extremely large memo usage is not a target case

## Korean

`Twitter User Memo`는 X(트위터) 프로필마다 개인 메모를 남길 수 있는 크롬 확장 프로그램입니다. 메모는 외부 서버로 전송되지 않으며, `chrome.storage.sync`에 저장되어 같은 크롬 계정 환경에서 동기화될 수 있습니다.

### 주요 기능

- 프로필 페이지에 개인 메모 추가
- 호버 카드에서 한 번의 클릭으로 빠른 메모 입력
- X 라이트/다크 테마 자동 감지
- 영어/한국어 로케일 지원
- 외부 API 호출 없음
- Manifest V3 기반

### 설치 방법

1. 이 저장소를 내려받습니다.
2. 크롬에서 `chrome://extensions`로 이동합니다.
3. **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 클릭합니다.
5. 이 프로젝트 폴더를 선택합니다.

### 저장 방식

메모는 아래와 같은 형태로 저장됩니다.

```json
{
  "@username": {
    "memo": "개인 메모",
    "updatedAt": 1712345678901
  }
}
```

일반적인 브라우저 캐시 삭제만으로는 메모가 사라지지 않지만, 확장 프로그램 제거 또는 확장 데이터 초기화 시에는 메모가 삭제될 수 있습니다.
