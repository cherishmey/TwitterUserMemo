# TwitterUserMemo

TwitterUserMemo is a Chrome extension for saving private notes on any X (Twitter) account. It adds a lightweight memo field directly to profile pages and hover cards, then syncs those notes through Chrome without sending data to external servers.

## Features

- Save private memos keyed by `@screen_name`
- Show memos on both profile pages and hover cards
- Auto-save while typing with a 300ms debounce
- Support both `x.com` and `twitter.com`
- Match X light and dark themes with a native-looking UI
- Keep data in `chrome.storage.sync` for Chrome account sync

## Installation

### Chrome Web Store

1. Open the Chrome Web Store.
2. Search for `TwitterUserMemo`.
3. Install the extension once the listing is available for your account or region.

### Developer Mode

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder.
6. Pin the extension if you want quick access from the toolbar.

## Usage

### Profile Pages

1. Open any user profile on `x.com` or `twitter.com`.
2. Find the memo block placed below the profile bio area.
3. Type your note. It saves automatically after you stop typing for 300ms.

### Hover Cards

1. Hover over a username or avatar so X opens the user hover card.
2. Click the small **Memo** badge at the bottom of the card.
3. Add or edit your note in the expanded textarea.
4. The note saves automatically and will appear again the next time you view that user.

## Screenshots

<!-- TODO: add screenshots -->

## Privacy

All memo data is stored in `chrome.storage.sync`, which stays inside Chrome's sync storage for your signed-in browser profile. The extension does not make network requests, use analytics, or send data to external servers.

## Tech Stack

- Vanilla JavaScript
- Chrome Extension Manifest V3
- `chrome.storage.sync`

## License

MIT

---

## 한국어

TwitterUserMemo는 X(트위터) 사용자 계정마다 개인 메모를 남길 수 있는 크롬 확장 프로그램입니다. 프로필 페이지와 호버 카드에 메모 입력 UI를 직접 추가하며, 외부 서버 없이 Chrome 동기화 저장소에만 데이터를 보관합니다.

### 기능

- `@screen_name` 기준으로 개인 메모 저장
- 프로필 페이지와 호버 카드 모두에서 메모 표시
- 입력 중 300ms 디바운스로 자동 저장
- `x.com`, `twitter.com` 동시 지원
- X의 라이트/다크 테마에 맞는 자연스러운 UI
- `chrome.storage.sync` 기반 동기화

### 설치

#### Chrome Web Store

1. Chrome 웹 스토어를 엽니다.
2. `TwitterUserMemo`를 검색합니다.
3. 스토어 등록이 제공되는 경우 확장 프로그램을 설치합니다.

#### 개발자 모드

1. 이 저장소를 다운로드하거나 클론합니다.
2. Chrome에서 `chrome://extensions`를 엽니다.
3. **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 클릭합니다.
5. 프로젝트 폴더를 선택합니다.

### 사용 방법

- 사용자 프로필을 열면 소개 영역 아래에 메모 섹션이 표시됩니다.
- 사용자 호버 카드를 열면 하단에 작은 **Memo** 배지가 표시되고, 클릭하면 메모 입력창이 펼쳐집니다.
- 입력 내용은 300ms 후 자동 저장됩니다.

### 개인정보

모든 메모 데이터는 `chrome.storage.sync`에만 저장됩니다. 외부 서버 전송, 분석 도구, 네트워크 요청은 없습니다.

### 기술 스택

- 바닐라 JavaScript
- Chrome Extension Manifest V3
- `chrome.storage.sync`

### 라이선스

MIT
