alert("JS読み込み成功");
const GAS_URL =
"https://script.google.com/macros/s/AKfycbxQtcgLhVls-tRFhXozax0SlhAPwdqnioB3NIz0IoSkhKG9X_xWwbu3uN5u49Ax223R/exec";

const params = new URLSearchParams(window.location.search);
const subjectId = params.get("id");

const subjectElement = document.getElementById("subject");
const target = document.getElementById("target");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

if (subjectId) {
    subjectElement.textContent = `被験者ID：${subjectId}`;
} else {
    subjectElement.textContent = "被験者IDが指定されていません";
}

let trial = 0;
const maxTrial = 3;

let startTime;
let reactionTimes = [];

let results = [];
let lapseCount = 0;
let falseStartCount = 0;
let trialFalseStartCount = 0;

let acceptingResponse = false;

startBtn.addEventListener("click", startTest);

function startTest() {

    startBtn.style.display = "none";

    nextTrial();
}

function nextTrial() {

    if (trial >= maxTrial) {
        finishTest();
        return;
    }

    acceptingResponse = false;
trialFalseStartCount = 0;

    target.className = "waiting";

    message.innerText =
        `${trial + 1} / ${maxTrial} 試行`;

    const waitTime =
        2000 + Math.random() * 3000;

    setTimeout(() => {

        target.className = "active";

        startTime = performance.now();

        acceptingResponse = true;

    }, waitTime);
}

target.addEventListener("click", () => {

    // フライング
    if (!acceptingResponse) {

        falseStartCount++;
trialFalseStartCount++;

        message.innerText =
            "フライングです";

        return;
    }

    // 二重タップ防止
    acceptingResponse = false;

    // ターゲットを即座に待機状態へ戻す
    target.className = "waiting";

    const rt =
        performance.now() - startTime;

    reactionTimes.push(rt);

    const lapse =
        rt >= 500;

    if (lapse) {
        lapseCount++;
    }

    results.push({
        id: subjectId,
        trial: trial + 1,
        rt: Math.round(rt),
        lapse: lapse,
        falseStartCount: trialFalseStartCount
    });

    trial++;

    message.innerText =
        `反応時間 ${Math.round(rt)} ms`;

    setTimeout(nextTrial, 1000);
});

async function finishTest() {

    const avg =
        reactionTimes.reduce(
            (a, b) => a + b, 0
        ) / reactionTimes.length;

    const fastest =
        Math.min(...reactionTimes);

    const slowest =
        Math.max(...reactionTimes);

    target.style.display = "none";

    message.innerText = "データ送信中...";

    await sendResults(
        Math.round(avg),
        Math.round(fastest),
        Math.round(slowest)
    );
}


async function sendResults(meanRT, minRT, maxRT) {

    message.innerText = "データ送信中...";
    
    const now = new Date();

    // 実施日時
    const datetime =
        now.getFullYear() + "/" +
        String(now.getMonth() + 1).padStart(2, "0") + "/" +
        String(now.getDate()).padStart(2, "0") + " " +
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0") + ":" +
        String(now.getSeconds()).padStart(2, "0");

    // セッションID
    const sessionId =
        subjectId + "_" +
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") + "_" +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");

    const sendData = {
        subjectId: subjectId,
        sessionId: sessionId,
        datetime: datetime,
        meanRT: meanRT,
        minRT: minRT,
        maxRT: maxRT,
        lapseCount: lapseCount,
        falseStartCount: falseStartCount,
        results: results
    };

 try {

    await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "text/plain"
        },
        body: JSON.stringify(sendData)
    });

    message.innerHTML = `
        <h3>検査終了</h3>

        データ送信処理完了<br><br>

        平均：${meanRT} ms<br>
        最速：${minRT} ms<br>
        最遅：${maxRT} ms<br>
        Lapse：${lapseCount}<br>
        False Start：${falseStartCount}
    `;

} catch (error) {

    message.innerText =
        "通信失敗：" + error.message;

    console.error(error);
}

}
