// on document ready
document.addEventListener("DOMContentLoaded", function (event) {
    const typewriterContainer = document.getElementById("typewriter-container");
    const animationDuration = 1000; // Duration of the typing animation in milliseconds
    const recordButton = document.getElementById("recordButton");
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get("key");
    const stalls = [
        "one second",
        "hmm, let's see",
        "uh, one moment",
        "got it",
        "ok",
        "just a moment",
        "gotchya",
        "ah",
    ];
    let recording = false;
    let myvad = null;

    function processAudio(audio) {
        const audioDuration = audio.length / 16000;

        if (audioDuration < 0.5) {
            recordButton.innerText = "Start Recording";
            return false;
        }

        if (audioDuration > 2) {
            speakRandomStall();
        }

        return true;
    }

    function speakRandomStall() {
        speak(stalls[Math.floor(Math.random() * stalls.length)]);
    }

    function speakOutputText(outputText) {
        if (outputText.split(" ").length > 5) {
            var firstSentence = outputText.split(/[.!?]/)[0] + ".";
            speak(firstSentence);

            var restOfText = outputText.substring(firstSentence.length).trim();
            setTimeout(function () {
                speak(restOfText);
            }, firstSentence.split(" ").length * 160);
        }
    }

    function postDataToAPI(audio) {
        const wavBuffer = vad.utils.encodeWAV(audio);
        const base64 = vad.utils.arrayBufferToBase64(wavBuffer);

        fetch("https://api.carterlabs.ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                audio: base64,
                key: apiKey,
                playerId: "PLAYER1",
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                var outputText = data.output.text;

                recordButton.innerText = "Start Recording";

                // restart animation of output
                const maxLength = 50;
                const lines = splitText(outputText, maxLength);
                addLinesSequentially(lines, animationDuration);
                speakOutputText(outputText);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function addLinesSequentially(lines, animationDuration) {
        typewriterContainer.innerHTML = "";
        for (const line of lines) {
            const typewriterLine = createTypewriterLine(line);
            typewriterContainer.appendChild(typewriterLine);
            await sleep(animationDuration);
        }
    }

    function createTypewriterLine(content) {
        const line = document.createElement("div");
        line.classList.add("typewriter-text");
        line.textContent = content;
        return line;
    }

    function splitText(text, maxLength) {
        const words = text.split(" ");
        const lines = [];
        let currentLine = "";

        for (const word of words) {
            if (currentLine.length + word.length <= maxLength) {
                currentLine += word + " ";
            } else {
                lines.push(currentLine.trim());
                currentLine = word + " ";
            }
        }

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        return lines;
    }

    function speak(toSay) {
        toSay = encodeURIComponent(toSay);
        toSay.replace(".", "%2E");

        fetch("https://api.carterlabs.ai/speak/female/" + toSay + "/" + apiKey)
            .then((response) => response.json())
            .then((data) => {
                console.log(data.file_url);

                // play audio from url
                const audio = new Audio(data.file_url);
                audio.play();
            })
            .catch((error) => {
                console.error(error);
            });
    }

    async function main() {
        myvad = await vad.MicVAD.new({
            positiveSpeechThreshold: 0.8,
            negativeSpeechThreshold: 0.8 - 0.15,
            minSpeechFrames: 1,
            preSpeechPadFrames: 1,
            redemptionFrames: 3,
            onSpeechStart: () => {
                recordButton.innerText = "Listening...";
            },
            onSpeechEnd: (audio) => {
                myvad.pause();

                recordButton.innerText = "Processing...";

                if (processAudio(audio)) {
                    postDataToAPI(audio);
                }
            },
        });
    }
    recordButton.addEventListener("click", () => {
        if (!recording) {
            recording = true;
            recordButton.innerText = "Listening...";
            myvad.start();
        } else {
            recording = false;
            recordButton.innerText = "Start Listening";
            myvad.pause();
        }
    });
    main();
});
