// YouTube IFrame Player APIを埋め込む
let ytPlayer;
let currentSongInterval; // 楽曲表示更新用のインターバル
let videos = []; // 動画データのキャッシュ

// APIの準備ができたときにプレイヤーを生成
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('sample', {
        height: '390',
        width: '640',
        videoId: '', // 初期状態では動画IDを空に
        playerVars: { controls: 1, autoplay: 0 },
        events: {
            'onReady': onPlayerReady,
            'onError': onPlayerError,
        },
    });
}

// JSONデータを読み込む
const loadVideos = async () => {
    try {
        const response = await fetch('./videos.json');
        if (!response.ok) throw new Error(`HTTP Error! status: ${response.status}`);
        videos = await response.json();
    } catch (error) {
        console.error('Failed to load JSON:', error);
        videos = [];
    }
};

// 動画選択用ドロップダウンを初期化
async function initializeVideoSelection() {
    await loadVideos(); // 動画データをロード
    const videoSelect = document.getElementById('video-select');
    const timestampSelect = document.getElementById('timestamp-select');
    const currentSongContainer = document.getElementById('current-song');

    // 動画選択ドロップダウンを生成
    videos.forEach((video, index) => {
        videoSelect.add(new Option(video.videoName, index));
    });

    // 動画が選択されたときのイベントリスナー
    videoSelect.addEventListener('change', ({ target: { value: idx } }) => {
        const video = videos[idx];
        if (!video) {
            resetTimestampDropdown(timestampSelect, currentSongContainer);
            return;
        }

        populateTimestampDropdown(video, timestampSelect); // タイムスタンプドロップダウンを更新
        resetCurrentSong(currentSongContainer); // 楽曲表示をリセット
    });

    // タイムスタンプが選択されたときのイベントリスナー
    timestampSelect.addEventListener('change', ({ target: { value: startSeconds } }) => {
        if (!isNaN(startSeconds)) {
            const videoIdx = videoSelect.value;
            const video = videos[videoIdx];
            const selectedTimestamp = video.timestamps.find(ts => ts.start === startSeconds);

            if (selectedTimestamp) {
                ytPlayer.loadVideoById({
                    videoId: video.videoId,
                    startSeconds: parseFloat(selectedTimestamp.start),
                });

                currentSongContainer.textContent = `現在の楽曲：${selectedTimestamp.title} ${selectedTimestamp.artist ? `(${selectedTimestamp.artist})` : ""}`;
            }
        }
    });
}

// タイムスタンプをドロップダウンに追加
function populateTimestampDropdown(video, dropdown) {
    dropdown.innerHTML = ''; // タイムスタンプドロップダウンを初期化

    video.timestamps.forEach(({ start, title, artist }) => {
        const optionText = `${title}${artist ? ` (${artist})` : ''}`;
        const option = new Option(optionText, start);
        dropdown.add(option);
    });
}

// タイムスタンプドロップダウンをリセット
function resetTimestampDropdown(dropdown, songContainer) {
    dropdown.innerHTML = '<option value="">歌枠を選んだら曲も選んでくれよな！</option>'; // デフォルト値を表示
    resetCurrentSong(songContainer);
}

// 現在の楽曲表示をリセット
function resetCurrentSong(songContainer) {
    songContainer.textContent = "現在の楽曲：";
}

// 楽曲情報を定期更新する処理
const startCurrentSongUpdateInterval = () => {
    currentSongInterval = setInterval(() => {
        const currentTime = ytPlayer.getCurrentTime();
        const currentVideoId = ytPlayer.getVideoData().video_id; // 現在の動画IDを取得
        const currentSongContainer = document.getElementById('current-song');

        // 現在の動画のタイムスタンプを取得
        const currentVideo = videos.find(video => video.videoId === currentVideoId);
        if (!currentVideo) return;

        const timestamps = currentVideo.timestamps;
        const currentTimestamp = timestamps.find((ts, idx) =>
            currentTime >= parseFloat(ts.start) &&
            (idx === timestamps.length - 1 || currentTime < parseFloat(timestamps[idx + 1].start))
        );

        // 楽曲を更新
        if (currentTimestamp) {
            currentSongContainer.textContent = `現在の楽曲：${currentTimestamp.title} ${currentTimestamp.artist ? `(${currentTimestamp.artist})` : ""}`;
        }
    }, 1000); // 1秒ごとに更新
};

// 再生ボタンやその他の制御ボタンを初期化
function initializeButtonControls() {
    const controls = {
        play: () => ytPlayer.playVideo(),
        pause: () => ytPlayer.pauseVideo(),
        stop: () => {
            ytPlayer.pauseVideo();
            ytPlayer.seekTo(0);
        },
        prev: () => ytPlayer.seekTo(Math.max(ytPlayer.getCurrentTime() - 10, 0)),
        next: () => ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10),
        volup: () => ytPlayer.setVolume(Math.min(ytPlayer.getVolume() + 10, 100)),
        voldown: () => ytPlayer.setVolume(Math.max(ytPlayer.getVolume() - 10, 0)),
        mute: () => ytPlayer.isMuted() ? ytPlayer.unMute() : ytPlayer.mute(),
    };

    Object.entries(controls).forEach(([id, fn]) =>
        document.getElementById(id).addEventListener('click', fn)
    );
}

// ランダム再生機能
document.getElementById('random').addEventListener('click', () => {
    const randomVideoIndex = Math.floor(Math.random() * videos.length); // ランダムで動画を選択
    const randomVideo = videos[randomVideoIndex];
    const randomTimestampIndex = Math.floor(Math.random() * randomVideo.timestamps.length); // ランダムでタイムスタンプを選択
    const randomTimestamp = randomVideo.timestamps[randomTimestampIndex];

    if (!randomVideo.videoId || !randomTimestamp.start) {
        return alert('無効な動画またはタイムスタンプです。');
    }

    ytPlayer.loadVideoById({
        videoId: randomVideo.videoId,
        startSeconds: parseInt(randomTimestamp.start, 10),
    });

    const currentSongContainer = document.getElementById('current-song');
    currentSongContainer.textContent = `現在の楽曲：${randomTimestamp.title} ${randomTimestamp.artist ? `(${randomTimestamp.artist})` : ""}`;
});

// プレイヤーが準備完了したときの処理
const onPlayerReady = () => {
    initializeButtonControls();
    startCurrentSongUpdateInterval(); // 定期更新を開始
};

// エラー発生時の処理
const onPlayerError = ({ data }) => console.error('エラーが発生しました:', data);

// ページが閉じられる際のインターバルクリア
window.addEventListener('beforeunload', () => clearInterval(currentSongInterval));

// DOMがロードされたら初期化
document.addEventListener('DOMContentLoaded', initializeVideoSelection);
