const display = document.querySelector("[data-display]");
const expressionDisplay = document.querySelector("[data-expression]");
const historyList = document.querySelector("[data-history]");
const calculator = document.querySelector(".calculator-layout");
const themeToggle = document.querySelector(".theme-toggle");
const copyLabel = document.querySelector("[data-copy-label]");

let expression = "";
let lastResult = null;
let completed = false;
let history = [];
let copyResetTimer;

function tokenize(input) {
    const tokens = [];
    let position = 0;

    while (position < input.length) {
        const rest = input.slice(position);
        const number = rest.match(/^(?:\d+\.?\d*|\.\d+)/);

        if (number) {
            tokens.push({ type: "number", value: Number(number[0]) });
            position += number[0].length;
            continue;
        }

        const character = input[position];
        if ("+-*/()%".includes(character)) {
            tokens.push({ type: character, value: character });
            position += 1;
            continue;
        }

        throw new Error("This expression contains an unsupported character.");
    }

    return tokens;
}

function calculate(input) {
    const tokens = tokenize(input);
    let position = 0;

    function peek(type) {
        return tokens[position]?.type === type;
    }

    function parsePrimary() {
        if (peek("number")) {
            return tokens[position++].value;
        }

        if (peek("(")) {
            position += 1;
            const value = parseExpression();
            if (!peek(")")) {
                throw new Error("Add a closing parenthesis.");
            }
            position += 1;
            return value;
        }

        throw new Error("Add a number to complete the expression.");
    }

    function parseUnary() {
        if (peek("+")) {
            position += 1;
            return parseUnary();
        }
        if (peek("-")) {
            position += 1;
            return -parseUnary();
        }

        let value = parsePrimary();
        while (peek("%")) {
            position += 1;
            value /= 100;
        }
        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (peek("*") || peek("/")) {
            const operator = tokens[position++].type;
            const right = parseUnary();
            if (operator === "/" && right === 0) {
                throw new Error("You can’t divide by zero.");
            }
            value = operator === "*" ? value * right : value / right;
        }

        return value;
    }

    function parseExpression() {
        let value = parseTerm();

        while (peek("+") || peek("-")) {
            const operator = tokens[position++].type;
            const right = parseTerm();
            value = operator === "+" ? value + right : value - right;
        }

        return value;
    }

    if (tokens.length === 0) {
        throw new Error("Enter a calculation first.");
    }

    const result = parseExpression();
    if (position !== tokens.length) {
        throw new Error("Check the operators and parentheses.");
    }
    if (!Number.isFinite(result)) {
        throw new Error("This calculation is outside the supported range.");
    }

    return result;
}

function formatResult(value) {
    const rounded = Number(value.toPrecision(12));
    return rounded.toLocaleString(undefined, { maximumSignificantDigits: 12 });
}

function readableExpression(value) {
    return value.replace(/\*/g, "×").replace(/\//g, "÷");
}

function updateDisplay() {
    expressionDisplay.textContent = readableExpression(expression);
    display.classList.remove("is-error");

    if (!expression) {
        display.textContent = "0";
        return;
    }

    try {
        display.textContent = formatResult(calculate(expression));
    } catch {
        display.textContent = "0";
    }
}

function addHistory(input, result) {
    history.unshift({ expression: input, result });
    history = history.slice(0, 8);
    renderHistory();
}

function renderHistory() {
    historyList.replaceChildren();

    if (history.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-history";
        empty.innerHTML = '<span class="empty-icon" aria-hidden="true">↗</span><p>Your calculations<br>will show up here.</p>';
        historyList.append(empty);
        return;
    }

    for (const item of history) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";

        const input = document.createElement("span");
        input.className = "history-expression";
        input.textContent = readableExpression(item.expression);

        const result = document.createElement("span");
        result.className = "history-result";
        result.textContent = formatResult(item.result);

        button.append(input, result);
        button.addEventListener("click", () => {
            expression = String(item.result);
            lastResult = item.result;
            completed = true;
            expressionDisplay.textContent = readableExpression(item.expression);
            display.classList.remove("is-error");
            display.textContent = formatResult(item.result);
        });
        historyList.append(button);
    }
}

function clearError() {
    display.classList.remove("is-error");
}

function addValue(value) {
    if (completed) {
        if (/[0-9.]/.test(value)) {
            expression = "";
        } else if (value !== "%") {
            expression = String(lastResult);
        }
        completed = false;
    }

    if (value === ".") {
        const currentNumber = expression.split(/[+\-*/()%]/).pop();
        if (currentNumber.includes(".")) {
            return;
        }
        if (currentNumber === "") {
            expression += "0";
        }
    }

    if ("+-*/".includes(value) && expression && /[+\-*/]$/.test(expression)) {
        expression = expression.slice(0, -1) + value;
    } else {
        expression += value;
    }
    clearError();
    updateDisplay();
}

function deleteLast() {
    if (completed) {
        expression = String(lastResult).slice(0, -1);
        completed = false;
    } else {
        expression = expression.slice(0, -1);
    }
    clearError();
    updateDisplay();
}

function toggleSign() {
    if (completed) {
        expression = String(lastResult);
        completed = false;
    }

    const numberMatch = expression.match(/(?:\d+\.?\d*|\.\d+)%?$/);
    if (!numberMatch) {
        expression += "-";
    } else {
        const numberStart = expression.length - numberMatch[0].length;
        const hasUnaryMinus = expression[numberStart - 1] === "-"
            && (numberStart === 1 || /[+\-*/(]/.test(expression[numberStart - 2]));
        expression = hasUnaryMinus
            ? expression.slice(0, numberStart - 1) + expression.slice(numberStart)
            : expression.slice(0, numberStart) + "-" + expression.slice(numberStart);
    }

    clearError();
    updateDisplay();
}

function showError(message) {
    display.textContent = message;
    display.classList.add("is-error");
}

function evaluateExpression() {
    try {
        const result = calculate(expression);
        const originalExpression = expression;
        lastResult = result;
        expression = String(result);
        completed = true;
        expressionDisplay.textContent = `${readableExpression(originalExpression)} =`;
        display.textContent = formatResult(result);
        display.classList.remove("is-error");
        addHistory(originalExpression, result);
    } catch (error) {
        showError(error.message);
    }
}

function clearCalculator() {
    expression = "";
    lastResult = null;
    completed = false;
    clearError();
    updateDisplay();
}

function clearHistory() {
    history = [];
    renderHistory();
}

async function copyResult() {
    let value = lastResult;
    if (value === null && expression) {
        try {
            value = calculate(expression);
        } catch (error) {
            showError(error.message);
            return;
        }
    }

    if (value === null) {
        copyLabel.textContent = "Nothing to copy";
    } else if (!navigator.clipboard?.writeText) {
        copyLabel.textContent = "Clipboard unavailable";
    } else {
        try {
            await navigator.clipboard.writeText(String(value));
            copyLabel.textContent = "Copied!";
        } catch {
            copyLabel.textContent = "Copy failed";
        }
    }

    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
        copyLabel.textContent = "Copy result";
    }, 1600);
}

calculator.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    if (button.dataset.value !== undefined) {
        addValue(button.dataset.value);
        return;
    }

    switch (button.dataset.action) {
        case "clear":
            clearCalculator();
            break;
        case "delete":
            deleteLast();
            break;
        case "sign":
            toggleSign();
            break;
        case "equals":
            evaluateExpression();
            break;
        case "copy":
            copyResult();
            break;
        case "clear-history":
            clearHistory();
            break;
    }
});

themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-theme");
    themeToggle.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
});

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    if (/^\d$/.test(event.key) || ["+", "-", "*", "/", "%", "."].includes(event.key)) {
        event.preventDefault();
        addValue(event.key);
    } else if (event.key === "x" || event.key === "X") {
        addValue("*");
    } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        evaluateExpression();
    } else if (event.key === "Backspace") {
        event.preventDefault();
        deleteLast();
    } else if (event.key === "Escape") {
        clearCalculator();
    } else if (event.key === "(" || event.key === ")") {
        addValue(event.key);
    }
});
