const API_BASE = "";

const appState = {
    signupResendTimer: null,
    signupResendRemaining: 45,
};

document.addEventListener("DOMContentLoaded", () => {
    initPasswordToggles();
    initPage();
    refreshIcons();
});

function initPage() {
    const page = document.body.dataset.page;

    switch (page) {
        case "login":
            initLoginPage();
            break;
        case "signup":
            initSignupPage();
            break;
        case "dashboard":
            if (requireAuth()) {
                loadDashboard();
            }
            break;
        case "jobs":
            if (requireAuth()) {
                initJobsPage();
            }
            break;
        case "job-detail":
            if (requireAuth()) {
                initJobDetailPage();
            }
            break;
        case "my-applications":
            if (requireAuth() && requireRole("seeker")) {
                loadMyApplications();
            }
            break;
        case "my-posts":
            if (requireAuth() && requireRole("company")) {
                loadMyPosts();
            }
            break;
        case "post-job":
            if (requireAuth() && requireRole("company")) {
                initPostJobPage();
            }
            break;
        case "job-applications":
            if (requireAuth() && requireRole("company")) {
                initJobApplicationsPage();
            }
            break;
        case "profile":
            if (requireAuth()) {
                loadProfile();
            }
            break;
        case "admin":
            if (requireAuth() && requireRole("admin")) {
                initAdminPage();
            }
            break;
        default:
            break;
    }
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function refreshDynamicUi() {
    initPasswordToggles();
    refreshIcons();
}

function getToken() {
    return localStorage.getItem("access_token");
}

function setToken(token) {
    localStorage.setItem("access_token", token);
}

function removeToken() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_data");
}

function getUserData() {
    const raw = localStorage.getItem("user_data");
    return raw ? JSON.parse(raw) : null;
}

function setUserData(data) {
    localStorage.setItem("user_data", JSON.stringify(data));
}

function isLoggedIn() {
    return Boolean(getToken());
}

function logout() {
    removeToken();
    window.location.href = "/login";
}

async function apiRequest(url, method = "GET", body = null, useAuth = true) {
    const headers = {};
    const options = { method, headers };

    if (useAuth && getToken()) {
        headers.Authorization = `Bearer ${getToken()}`;
    }

    if (body) {
        if (body instanceof URLSearchParams) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            options.body = body;
        } else {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch(`${API_BASE}${url}`, options);
    const contentType = response.headers.get("content-type") || "";
    let payload = null;

    if (response.status !== 204) {
        if (contentType.includes("application/json")) {
            payload = await response.json();
        } else {
            payload = await response.text();
        }
    }

    if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null
            ? payload.detail || "Something went wrong"
            : payload || "Something went wrong";

        if (response.status === 401 && useAuth) {
            removeToken();
            window.location.href = "/login";
            throw new Error("Session expired");
        }

        throw new Error(detail);
    }

    return payload ?? { success: true };
}

function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = "/login";
        return false;
    }
    return true;
}

function requireRole(role) {
    const user = getUserData();
    if (!user || user.role !== role) {
        window.location.href = "/dashboard";
        return false;
    }
    return true;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function validateEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
        return "Not specified";
    }
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatJobType(value) {
    const label = String(value || "").trim();
    if (!label) {
        return "Flexible";
    }
    return label
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function titleCase(value) {
    return String(value || "")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitial(value) {
    return value ? value.charAt(0).toUpperCase() : "?";
}

function getRoleBadgeClass(role) {
    return `role-badge role-badge--${role}`;
}

function getStatusChipClass(status) {
    if (status === "accepted" || status === "active") {
        return "chip chip--success";
    }
    if (status === "rejected" || status === "inactive") {
        return "chip chip--error";
    }
    return "chip chip--warning";
}

function renderLogoMarkup(extraClass = "") {
    const className = ["brand", extraClass].filter(Boolean).join(" ");
    return `
        <a href="/dashboard" class="${className}" aria-label="Hirely">
            <span class="brand__mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M8 7V5.75C8 4.784 8.784 4 9.75 4h4.5C15.216 4 16 4.784 16 5.75V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                    <path d="M4.75 8.5h14.5c.966 0 1.75.784 1.75 1.75v7c0 .966-.784 1.75-1.75 1.75H4.75A1.75 1.75 0 0 1 3 17.25v-7c0-.966.784-1.75 1.75-1.75Z" stroke="currentColor" stroke-width="1.8"></path>
                    <path d="M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                </svg>
            </span>
            <span class="brand__wordmark"><span class="brand__hire">Hire</span><span class="brand__ly">ly</span></span>
        </a>
    `;
}

function setButtonBusy(button, isBusy, busyLabel, defaultLabel) {
    if (!button) {
        return;
    }

    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = defaultLabel || button.textContent.trim();
    }

    button.disabled = isBusy;
    button.innerHTML = isBusy
        ? `<span class="spinner"></span><span>${escapeHtml(busyLabel)}</span>`
        : escapeHtml(button.dataset.defaultLabel);
}

function clearAlert(id) {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }
    element.className = "form-message";
    element.textContent = "";
}

function showAlert(id, message, type = "error") {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }
    element.textContent = message;
    element.className = `form-message form-message--${type} is-visible`;
}

function clearFieldError(fieldId) {
    const element = document.getElementById(`${fieldId}-error`);
    const field = document.getElementById(fieldId);
    if (element) {
        element.textContent = "";
        element.classList.remove("is-visible");
    }
    if (field) {
        field.classList.remove("is-invalid");
    }
}

function showFieldError(fieldId, message) {
    const element = document.getElementById(`${fieldId}-error`);
    const field = document.getElementById(fieldId);
    if (element) {
        element.textContent = message;
        element.classList.add("is-visible");
    }
    if (field) {
        field.classList.add("is-invalid");
    }
}

function clearFieldErrors(scope = document) {
    scope.querySelectorAll(".field-error").forEach((element) => {
        element.textContent = "";
        element.classList.remove("is-visible");
    });
    scope.querySelectorAll(".is-invalid").forEach((element) => {
        element.classList.remove("is-invalid");
    });
}

function initPasswordToggles(root = document) {
    root.querySelectorAll("[data-password-toggle]").forEach((button) => {
        if (button.dataset.bound === "true") {
            return;
        }
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            const targetId = button.dataset.passwordToggle;
            const field = document.getElementById(targetId);
            if (!field) {
                return;
            }
            const isVisible = field.type === "password";
            field.type = isVisible ? "text" : "password";
            button.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
            button.innerHTML = `<i data-lucide="${isVisible ? "eye-off" : "eye"}"></i>`;
            refreshIcons();
        });
    });
}

function renderNavbar() {
    const navbar = document.getElementById("navbar");
    const user = getUserData();

    if (!navbar || !user) {
        return;
    }

    const currentPath = window.location.pathname;
    const linkSets = {
        seeker: [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/browse-jobs", label: "Browse Jobs" },
            { href: "/my-applications", label: "My Applications" },
            { href: "/profile", label: "Profile" },
        ],
        company: [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/browse-jobs", label: "Browse Jobs" },
            { href: "/my-posts", label: "My Posts" },
            { href: "/post-job", label: "Post Job" },
            { href: "/profile", label: "Profile" },
        ],
        admin: [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/browse-jobs", label: "Browse Jobs" },
            { href: "/admin-panel", label: "Admin Panel" },
            { href: "/profile", label: "Profile" },
        ],
    };

    const navLinks = (linkSets[user.role] || []).map((link) => {
        const isActive = currentPath === link.href || (link.href !== "/dashboard" && currentPath.startsWith(link.href));
        return `<a class="topbar__link ${isActive ? "is-active" : ""}" href="${link.href}">${link.label}</a>`;
    }).join("");

    navbar.innerHTML = `
        <div class="topbar__brand">${renderLogoMarkup()}</div>
        <div class="topbar__nav">${navLinks}</div>
        <div class="topbar__user">
            <div class="avatar">${escapeHtml(getInitial(user.username))}</div>
            <div class="user-meta">
                <span class="user-meta__name">${escapeHtml(user.username)}</span>
                <span class="${getRoleBadgeClass(user.role)}">${escapeHtml(titleCase(user.role))}</span>
            </div>
            <button class="button button--ghost" type="button" onclick="logout()">Logout</button>
        </div>
    `;

    refreshIcons();
}

function initLoginPage() {
    if (isLoggedIn()) {
        window.location.href = "/dashboard";
        return;
    }

    const loginForm = document.getElementById("login-form");
    const resendButton = document.getElementById("login-resend-button");

    if (loginForm) {
        loginForm.addEventListener("submit", loginUser);
    }

    if (resendButton) {
        resendButton.addEventListener("click", resendVerificationFromLogin);
    }
}

async function loginUser(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    clearFieldErrors(form);
    clearAlert("login-form-message");
    clearAlert("login-resend-message");
    document.getElementById("login-resend-panel")?.classList.add("is-hidden");

    let hasError = false;

    if (!username) {
        showFieldError("username", "Username is required");
        hasError = true;
    }

    if (!password) {
        showFieldError("password", "Password is required");
        hasError = true;
    }

    if (hasError) {
        return;
    }

    setButtonBusy(submitButton, true, "Signing in...", "Sign in");

    try {
        const credentials = new URLSearchParams();
        credentials.append("username", username);
        credentials.append("password", password);

        const tokenResponse = await apiRequest("/auth/token", "POST", credentials, false);
        setToken(tokenResponse.access_token);

        const profile = await apiRequest("/user/me");
        setUserData(profile);

        window.location.href = "/dashboard";
    } catch (error) {
        if (error.message.toLowerCase().includes("incorrect")) {
            showFieldError("password", "Incorrect username or password");
        } else if (error.message.toLowerCase().includes("verified")) {
            showAlert("login-form-message", "Email not verified. Request a fresh code to continue.", "warning");
            document.getElementById("login-resend-panel")?.classList.remove("is-hidden");
        } else {
            showAlert("login-form-message", error.message, "error");
        }
    } finally {
        setButtonBusy(submitButton, false, "Signing in...", "Sign in");
    }
}

async function resendVerificationFromLogin() {
    clearFieldError("login-resend-email");
    clearAlert("login-resend-message");

    const button = document.getElementById("login-resend-button");
    const emailField = document.getElementById("login-resend-email");
    const email = emailField ? emailField.value.trim() : "";

    if (!email) {
        showFieldError("login-resend-email", "Email is required");
        return;
    }

    if (!validateEmail(email)) {
        showFieldError("login-resend-email", "Enter a valid email address");
        return;
    }

    setButtonBusy(button, true, "Sending...", "Resend verification code");

    try {
        await apiRequest("/auth/resend-verification", "POST", { email }, false);
        showAlert("login-resend-message", "A new verification code was sent to your inbox.", "success");
    } catch (error) {
        showAlert("login-resend-message", error.message, "error");
    } finally {
        setButtonBusy(button, false, "Sending...", "Resend verification code");
    }
}

function initSignupPage() {
    if (isLoggedIn()) {
        window.location.href = "/dashboard";
        return;
    }

    document.getElementById("signup-form")?.addEventListener("submit", signupUser);
    document.getElementById("verification-form")?.addEventListener("submit", submitSignupVerification);
    document.getElementById("resend-verification-link")?.addEventListener("click", resendSignupVerification);

    initRoleToggle();
    initVerificationInputs();
}

function initRoleToggle() {
    const toggle = document.getElementById("role-toggle");
    if (!toggle) {
        return;
    }

    toggle.querySelectorAll("[data-role]").forEach((button) => {
        button.addEventListener("click", () => {
            setSignupRole(button.dataset.role);
        });
    });

    setSignupRole(toggle.dataset.role || "seeker");
}

function setSignupRole(role) {
    const toggle = document.getElementById("role-toggle");
    const companyGroup = document.getElementById("company-group");
    if (!toggle) {
        return;
    }

    toggle.dataset.role = role;
    toggle.querySelectorAll("[data-role]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.role === role);
    });

    if (companyGroup) {
        companyGroup.classList.toggle("is-hidden", role !== "company");
    }
}

async function signupUser(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const role = document.getElementById("role-toggle")?.dataset.role || "seeker";
    const username = document.getElementById("signup-username").value.trim();
    const companyName = document.getElementById("signup-company-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    clearFieldErrors(form);
    clearAlert("signup-form-message");

    let hasError = false;

    if (!username) {
        showFieldError("signup-username", "Username is required");
        hasError = true;
    } else if (username.length < 3) {
        showFieldError("signup-username", "Username must be at least 3 characters");
        hasError = true;
    }

    if (role === "company") {
        if (!companyName) {
            showFieldError("signup-company-name", "Company name is required");
            hasError = true;
        } else if (companyName.length < 2) {
            showFieldError("signup-company-name", "Company name must be at least 2 characters");
            hasError = true;
        }
    }

    if (!email) {
        showFieldError("signup-email", "Email is required");
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError("signup-email", "Enter a valid email address");
        hasError = true;
    }

    if (!password) {
        showFieldError("signup-password", "Password is required");
        hasError = true;
    } else if (password.length < 8) {
        showFieldError("signup-password", "Password must be at least 8 characters");
        hasError = true;
    }

    if (!confirmPassword) {
        showFieldError("signup-confirm-password", "Please confirm your password");
        hasError = true;
    } else if (password !== confirmPassword) {
        showFieldError("signup-confirm-password", "Passwords do not match");
        hasError = true;
    }

    if (hasError) {
        return;
    }

    setButtonBusy(button, true, "Creating account...", "Create account");

    try {
        const endpoint = role === "company" ? "/auth/signup/company" : "/auth/signup/seeker";
        const body = { username, email, password };

        if (role === "company") {
            body.company_name = companyName;
        }

        await apiRequest(endpoint, "POST", body, false);
        showSignupVerificationStep(email);
    } catch (error) {
        const message = error.message.toLowerCase();
        if (message.includes("username")) {
            showFieldError("signup-username", error.message);
        } else if (message.includes("email")) {
            showFieldError("signup-email", error.message);
        } else if (message.includes("company")) {
            showFieldError("signup-company-name", error.message);
        } else {
            showAlert("signup-form-message", error.message, "error");
        }
    } finally {
        setButtonBusy(button, false, "Creating account...", "Create account");
    }
}

function showSignupVerificationStep(email) {
    document.getElementById("signup-form-step")?.classList.add("is-hidden");
    document.getElementById("signup-verification-step")?.classList.remove("is-hidden");
    document.getElementById("signup-title").textContent = "Check your inbox";
    document.getElementById("signup-subtitle").textContent = "We sent a 6-digit code to your email address.";
    document.getElementById("verification-email").value = email;
    document.getElementById("verification-email-display").textContent = email;
    document.getElementById("verification-message").className = "form-message";
    document.getElementById("verification-message").textContent = "";
    clearFieldError("verification-code");
    setVerificationCode("");
    document.querySelector('.otp-input[data-otp-index="0"]')?.focus();
    startSignupResendCountdown(45);
    refreshDynamicUi();
}

function initVerificationInputs() {
    const inputs = Array.from(document.querySelectorAll(".otp-input"));
    if (!inputs.length) {
        return;
    }

    inputs.forEach((input, index) => {
        input.addEventListener("input", (event) => {
            const value = event.target.value.replace(/\D/g, "").slice(-1);
            event.target.value = value;
            clearFieldError("verification-code");

            if (value && inputs[index + 1]) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && !event.currentTarget.value && inputs[index - 1]) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", (event) => {
            event.preventDefault();
            const pasted = (event.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
            if (!pasted) {
                return;
            }
            setVerificationCode(pasted);
        });
    });
}

function setVerificationCode(code) {
    const digits = String(code || "").replace(/\D/g, "").slice(0, 6).split("");
    const inputs = Array.from(document.querySelectorAll(".otp-input"));

    inputs.forEach((input, index) => {
        input.value = digits[index] || "";
    });

    const nextInput = inputs.find((input) => !input.value) || inputs[inputs.length - 1];
    nextInput?.focus();
}

function getVerificationCode() {
    return Array.from(document.querySelectorAll(".otp-input"))
        .map((input) => input.value.trim())
        .join("");
}

async function submitSignupVerification(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const email = document.getElementById("verification-email").value.trim();
    const code = getVerificationCode();

    clearFieldError("verification-code");
    clearAlert("verification-message");

    if (code.length !== 6) {
        showFieldError("verification-code", "Enter the full 6-digit code");
        return;
    }

    setButtonBusy(button, true, "Verifying...", "Verify");

    try {
        await apiRequest("/auth/verify-email", "POST", { email, code }, false);
        showAlert("verification-message", "Email verified. Redirecting to login...", "success");
        setTimeout(() => {
            window.location.href = "/login";
        }, 1000);
    } catch (error) {
        showAlert("verification-message", error.message, "error");
    } finally {
        setButtonBusy(button, false, "Verifying...", "Verify");
    }
}

function startSignupResendCountdown(seconds) {
    clearInterval(appState.signupResendTimer);
    appState.signupResendRemaining = seconds;
    updateSignupResendState();

    appState.signupResendTimer = setInterval(() => {
        appState.signupResendRemaining -= 1;
        updateSignupResendState();

        if (appState.signupResendRemaining <= 0) {
            clearInterval(appState.signupResendTimer);
            appState.signupResendTimer = null;
        }
    }, 1000);
}

function updateSignupResendState() {
    const button = document.getElementById("resend-verification-link");
    const label = document.getElementById("resend-countdown");
    if (!button || !label) {
        return;
    }

    const seconds = Math.max(appState.signupResendRemaining, 0);
    const minutesPart = Math.floor(seconds / 60);
    const secondsPart = String(seconds % 60).padStart(2, "0");

    if (seconds > 0) {
        button.disabled = true;
        label.textContent = `Resend available in ${minutesPart}:${secondsPart}`;
    } else {
        button.disabled = false;
        label.textContent = "You can resend a new code now";
    }
}

async function resendSignupVerification() {
    const button = document.getElementById("resend-verification-link");
    const email = document.getElementById("verification-email").value.trim();

    if (!button || button.disabled) {
        return;
    }

    clearAlert("verification-message");

    try {
        button.disabled = true;
        await apiRequest("/auth/resend-verification", "POST", { email }, false);
        showAlert("verification-message", "A new verification code has been sent.", "success");
        startSignupResendCountdown(45);
    } catch (error) {
        showAlert("verification-message", error.message, "error");
        button.disabled = false;
    }
}

async function loadDashboard() {
    renderNavbar();
    const user = getUserData();
    const container = document.getElementById("dashboard-content");

    if (!user || !container) {
        return;
    }

    if (user.role === "seeker") {
        await loadSeekerDashboard(container);
    } else if (user.role === "company") {
        await loadCompanyDashboard(container);
    } else if (user.role === "admin") {
        await loadAdminDashboard(container);
    }
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return "Good morning";
    } else if (hour < 18) {
        return "Good afternoon";
    } else {
        return "Good evening";
    }
}

function renderStatCard(icon, value, label, color = "#6B5FED", href = "") {
    const hrefAttr = href ? ` data-href="${href}"` : "";
    return `
        <div class="stat-card"${hrefAttr} style="--stat-color: ${color}">
            <span class="stat-card__icon"><i data-lucide="${icon}"></i></span>
            <div class="stat-card__value">${escapeHtml(value)}</div>
            <div class="stat-card__label">${escapeHtml(label)}</div>
        </div>
    `;
}

function renderQuickActionCard(href, icon, title, subtitle) {
    return `
        <a class="quick-action-card" href="${href}">
            <span class="quick-action-card__icon"><i data-lucide="${icon}"></i></span>
            <div>
                <h3 class="quick-action-card__title">${escapeHtml(title)}</h3>
                <p class="quick-action-card__subtitle">${escapeHtml(subtitle)}</p>
            </div>
            <span class="quick-action-card__arrow"><i data-lucide="arrow-right"></i></span>
        </a>
    `;
}

function renderEmptyState(icon, title, copy) {
    return `
        <div class="empty-state">
            <div class="empty-state__icon"><i data-lucide="${icon}"></i></div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(copy)}</p>
        </div>
    `;
}

async function loadSeekerDashboard(container) {
    try {
        const [applications, jobs] = await Promise.all([
            apiRequest("/applications/my-applications"),
            apiRequest("/jobs/"),
        ]);

        const jobsById = new Map(jobs.map((job) => [job.id, job]));
        const pendingCount = applications.filter((item) => item.status === "pending").length;
        const acceptedCount = applications.filter((item) => item.status === "accepted").length;
        const rejectedCount = applications.filter((item) => item.status === "rejected").length;
        
        // Create Recent Activity with status dots
        const recentActivity = applications.slice(-4).reverse().map((item) => {
            const relatedJob = jobsById.get(item.job_id);
            let statusClass = "status-pending";
            if (item.status === "accepted") statusClass = "status-accepted";
            if (item.status === "rejected") statusClass = "status-rejected";
            
            return `
                <div class="activity-item">
                    <div class="activity-item__dot ${statusClass}"></div>
                    <div>
                        <p class="activity-item__title">${escapeHtml(relatedJob ? relatedJob.title : `Application #${item.id}`)}</p>
                        <p class="activity-item__meta">${escapeHtml(titleCase(item.status))} · ${escapeHtml(relatedJob ? relatedJob.company : "Hirely")}</p>
                    </div>
                </div>
            `;
        }).join("");

        // Create Latest Jobs section
        const latestJobs = jobs.slice(0, 3).map((job) => `
            <article class="latest-job-card">
                <div class="latest-job-card__header">
                    <div>
                        <h3 class="latest-job-card__title">${escapeHtml(job.title)}</h3>
                        <div class="latest-job-card__meta">
                            <span class="latest-job-card__company">${escapeHtml(job.company)}</span>
                            <span class="latest-job-card__badge">${escapeHtml(formatJobType(job.job_type))}</span>
                        </div>
                    </div>
                </div>
                <p class="latest-job-card__description">${escapeHtml((job.description || "").substring(0, 120))}</p>
                <div class="latest-job-card__footer">
                    <p class="latest-job-card__location"><i data-lucide="map-pin" style="width: 14px; height: 14px; display: inline; margin-right: 4px;"></i>${escapeHtml(job.location)}</p>
                    <a href="/job-detail/${job.id}" class="latest-job-card__apply-btn">View</a>
                </div>
            </article>
        `).join("");

        const greeting = getGreeting();
        const user = getUserData();
        const username = user ? escapeHtml(user.username) : "there";

        container.innerHTML = `
            <section class="stats-grid">
                ${renderStatCard("file-text", applications.length, "Applications", "#6B5FED", "/my-applications")}
                ${renderStatCard("clock-3", pendingCount, "Pending reviews", "#F59E0B", "/my-applications")}
                ${renderStatCard("check-check", acceptedCount, "Accepted", "#22C55E")}
                ${renderStatCard("x-circle", rejectedCount, "Rejected", "#EF4444")}
            </section>

            <div class="dashboard-grid">
                <article class="panel-card">
                    <div class="panel-card__header">
                        <div>
                            <h2 class="panel-card__title">Latest Jobs</h2>
                            <p class="panel-card__copy">The most recent opportunities posted on Hirely</p>
                        </div>
                    </div>
                    ${jobs.length
                        ? `<div class="latest-jobs-list">${latestJobs}</div>`
                        : renderEmptyState("briefcase", "No jobs available", "Check back soon for new opportunities")}
                </article>

                <article class="panel-card">
                    <div class="panel-card__header">
                        <div>
                            <h2 class="panel-card__title">Recent Activity</h2>
                            <p class="panel-card__copy">The latest updates across your application flow</p>
                        </div>
                    </div>
                    ${applications.length
                        ? `<div class="activity-list">${recentActivity}</div>`
                        : renderEmptyState("activity", "No activity yet", "Start by browsing jobs")}
                </article>
            </div>
        `;

        refreshDynamicUi();

        // Add click handlers to stat cards
        document.querySelectorAll(".stat-card[data-href]").forEach((card) => {
            card.addEventListener("click", (e) => {
                e.preventDefault();
                const href = card.dataset.href;
                if (href) {
                    window.location.href = href;
                }
            });
        });
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function loadCompanyDashboard(container) {
    try {
        const jobs = await apiRequest("/jobs/my/posts");
        const applicationSets = await Promise.all(
            jobs.map(async (job) => {
                try {
                    return await apiRequest(`/applications/job/${job.id}`);
                } catch (error) {
                    return [];
                }
            })
        );

        const totalApplications = applicationSets.reduce((sum, items) => sum + items.length, 0);
        const activeJobs = jobs.filter((job) => job.is_active).length;
        const pendingReviews = applicationSets.flat().filter((item) => item.status === "pending").length;
        const recentJobs = jobs.slice(-3).reverse().map((job) => `
            <div class="activity-item">
                <p class="activity-item__title">${escapeHtml(job.title)}</p>
                <p class="activity-item__meta">${escapeHtml(job.location)} · ${escapeHtml(formatCurrency(job.salary))}</p>
            </div>
        `).join("");

        container.innerHTML = `
            <section class="stats-grid">
               ${renderStatCard("briefcase", jobs.length,        "Posted jobs",    "#6B5FED", "")}
               ${renderStatCard("briefcase", activeJobs,          "Active jobs",    "#22C55E", "")}
               ${renderStatCard("users",     totalApplications,   "Applications",   "#6B5FED", "")}
               ${renderStatCard("clock-3",   pendingReviews,      "Pending reviews","#F59E0B", "")}
            </section>

            <section class="section-grid">
                <div class="stack-16">
                    ${renderQuickActionCard("/post-job", "plus", "Post New Job", "Publish a new opening in your pipeline")}
                    ${renderQuickActionCard("/my-posts", "briefcase", "My Job Posts", "Manage listings and view applicants")}
                    ${renderQuickActionCard("/browse-jobs", "search", "Browse Market", "Compare your roles against other openings")}
                </div>

                <article class="panel-card">
                    <div class="panel-card__header">
                        <div>
                            <h2 class="panel-card__title">Recent Listings</h2>
                            <p class="panel-card__copy">Your latest published roles and salary context.</p>
                        </div>
                    </div>
                    ${jobs.length
                        ? `<div class="activity-list">${recentJobs}</div>`
                        : renderEmptyState("briefcase", "No job posts yet", "Publish your first opening to start collecting applicants")}
                </article>
            </section>
        `;

        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function loadAdminDashboard(container) {
    try {
        const [users, jobs, applications] = await Promise.all([
            apiRequest("/admin/users"),
            apiRequest("/admin/jobs"),
            apiRequest("/admin/applications"),
        ]);

        const activeUsers = users.filter((user) => user.is_active).length;
        const activeJobs = jobs.filter((job) => job.is_active).length;

        container.innerHTML = `
            <section class="stats-grid">
                ${renderStatCard("users", users.length, "Users", "#6B5FED")}
                ${renderStatCard("shield", activeUsers, "Active users", "#22C55E")}
                ${renderStatCard("briefcase", jobs.length, "Jobs", "#6B5FED")}
                ${renderStatCard("file-text", applications.length, "Applications", "#6B5FED")}
            </section>

            <section class="section-grid">
                <article class="panel-card">
                    <div class="panel-card__header">
                        <div>
                            <h2 class="panel-card__title">System Snapshot</h2>
                            <p class="panel-card__copy">A concise operational summary of the current workspace.</p>
                        </div>
                    </div>
                    <div class="meta-list">
                        <div class="meta-list__item">
                            <p class="meta-list__label">Active users</p>
                            <p class="meta-list__value">${escapeHtml(activeUsers)}</p>
                        </div>
                        <div class="meta-list__item">
                            <p class="meta-list__label">Active job listings</p>
                            <p class="meta-list__value">${escapeHtml(activeJobs)}</p>
                        </div>
                        <div class="meta-list__item">
                            <p class="meta-list__label">Total applications</p>
                            <p class="meta-list__value">${escapeHtml(applications.length)}</p>
                        </div>
                    </div>
                </article>

                <div class="stack-16">
                    ${renderQuickActionCard("/admin-panel", "shield", "Open Admin Panel", "Review moderation actions and account state")}
                    ${renderQuickActionCard("/browse-jobs", "search", "Browse Jobs", "Inspect live job content from the public surface")}
                    ${renderQuickActionCard("/profile", "user", "My Profile", "Manage your own admin credentials")}
                </div>
            </section>
        `;

        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

function initJobsPage() {
    const form = document.getElementById("job-search-form");
    const resetButton = document.getElementById("reset-job-search");

    renderNavbar();
    loadJobs();

    form?.addEventListener("submit", searchJobs);
    resetButton?.addEventListener("click", () => {
        form.reset();
        loadJobs();
    });
}

function buildJobCard(job, extraActions = "") {
    return `
        <article class="job-card">
            <div class="job-card__header">
                <div>
                    <h3 class="job-card__title">${escapeHtml(job.title)}</h3>
                    <p class="job-card__company">${escapeHtml(job.company)}</p>
                </div>
                <div class="salary salary-amount">${escapeHtml(formatCurrency(job.salary))}</div>
            </div>
            <p class="job-card__description">${escapeHtml(job.description)}</p>
            <div class="chip-row">
                <span class="chip"><i data-lucide="map-pin"></i>${escapeHtml(job.location)}</span>
                <span class="chip"><i data-lucide="briefcase"></i>${escapeHtml(formatJobType(job.job_type))}</span>
                ${job.is_active === false ? '<span class="chip chip--error">Inactive</span>' : ""}
            </div>
            ${extraActions || `<div class="list-card__actions"><a class="button button--secondary" href="/job/${job.id}">View role</a></div>`}
        </article>
    `;
}

async function loadJobs(filters = null) {
    const container = document.getElementById("jobs-list");
    if (!container) {
        return;
    }

    try {
        const endpoint = filters ? buildJobsSearchUrl(filters) : "/jobs/";
        const jobs = await apiRequest(endpoint);

        if (!jobs.length) {
            container.innerHTML = renderEmptyState("search", "No jobs found", "Try adjusting your filters or check back later");
            refreshDynamicUi();
            return;
        }

        container.innerHTML = jobs.map((job) => buildJobCard(job)).join("");
        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

function buildJobsSearchUrl(filters) {
    const params = new URLSearchParams();
    if (filters.location) {
        params.set("location", filters.location);
    }
    if (filters.company) {
        params.set("company", filters.company);
    }
    if (filters.jobType) {
        params.set("job_type", filters.jobType);
    }
    if (filters.minSalary) {
        params.set("min_salary", filters.minSalary);
    }
    return `/jobs/search?${params.toString()}`;
}

async function searchJobs(event) {
    event.preventDefault();
    const filters = {
        location: document.getElementById("search-location").value.trim(),
        company: document.getElementById("search-company").value.trim(),
        jobType: document.getElementById("search-job-type").value,
        minSalary: document.getElementById("search-min-salary").value.trim(),
    };

    await loadJobs(filters);
}

function initJobDetailPage() {
    renderNavbar();
    const container = document.getElementById("job-detail-content");
    const jobId = container?.dataset.jobId;

    if (jobId) {
        loadJobDetail(Number(jobId));
    }
}

async function loadJobDetail(jobId) {
    const container = document.getElementById("job-detail-content");
    const user = getUserData();

    if (!container) {
        return;
    }

    try {
        const job = await apiRequest(`/jobs/${jobId}`);

        const applyPanel = user?.role === "seeker"
            ? `
                <aside class="summary-card">
                    <div class="summary-card__header">
                        <div>
                            <h2 class="summary-card__title">Apply for this role</h2>
                            <p class="summary-card__copy">Send a concise cover letter directly from your workspace.</p>
                        </div>
                    </div>
                    <form id="apply-form" class="panel-form" novalidate>
                        <div id="apply-alert" class="form-message" aria-live="polite"></div>
                        <div class="form-field">
                            <label class="form-label" for="cover-letter">Cover letter</label>
                            <textarea class="form-input form-input--textarea" id="cover-letter" placeholder="Explain why you're a strong fit for this role."></textarea>
                            <p class="field-error" id="cover-letter-error" aria-live="polite"></p>
                        </div>
                        <button class="button button--primary" type="submit">Apply</button>
                    </form>
                </aside>
            `
            : `
                <aside class="summary-card">
                    <div class="summary-card__header">
                        <div>
                            <h2 class="summary-card__title">Role Snapshot</h2>
                            <p class="summary-card__copy">A concise summary of the opportunity.</p>
                        </div>
                    </div>
                    <div class="meta-list">
                        <div class="meta-list__item">
                            <p class="meta-list__label">Company</p>
                            <p class="meta-list__value">${escapeHtml(job.company)}</p>
                        </div>
                        <div class="meta-list__item">
                            <p class="meta-list__label">Location</p>
                            <p class="meta-list__value">${escapeHtml(job.location)}</p>
                        </div>
                        <div class="meta-list__item">
                            <p class="meta-list__label">Compensation</p>
                            <p class="meta-list__value salary-amount">${escapeHtml(formatCurrency(job.salary))}</p>
                        </div>
                    </div>
                </aside>
            `;

        container.innerHTML = `
            <div class="detail-layout">
                <div class="stack-16">
                    <article class="detail-card detail-hero">
                        <div>
                            <h1 class="detail-hero__title">${escapeHtml(job.title)}</h1>
                            <p class="detail-hero__company">${escapeHtml(job.company)}</p>
                        </div>
                        <div class="chip-row">
                            <span class="chip"><i data-lucide="map-pin"></i>${escapeHtml(job.location)}</span>
                            <span class="chip"><i data-lucide="briefcase"></i>${escapeHtml(formatJobType(job.job_type))}</span>
                            <span class="chip"><i data-lucide="wallet"></i><span class="salary-amount">${escapeHtml(formatCurrency(job.salary))}</span></span>
                        </div>
                    </article>
                    <article class="detail-card detail-body">
                        <h2>Job Description</h2>
                        <p>${escapeHtml(job.description)}</p>
                    </article>
                </div>
                ${applyPanel}
            </div>
        `;

        document.getElementById("apply-form")?.addEventListener("submit", (event) => applyToJob(event, job.id));
        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function applyToJob(event, jobId) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const coverLetter = document.getElementById("cover-letter").value.trim();
    let submitted = false;

    clearFieldErrors(form);
    clearAlert("apply-alert");

    if (!coverLetter) {
        showFieldError("cover-letter", "Cover letter is required");
        return;
    }

    if (coverLetter.length < 10) {
        showFieldError("cover-letter", "Cover letter must be at least 10 characters");
        return;
    }

    setButtonBusy(button, true, "Submitting...", "Apply");

    try {
        await apiRequest("/applications/", "POST", {
            job_id: jobId,
            cover_letter: coverLetter,
        });
        showAlert("apply-alert", "Application submitted successfully.", "success");
        submitted = true;
    } catch (error) {
        showAlert("apply-alert", error.message, "error");
    } finally {
        if (submitted) {
            button.disabled = true;
            button.textContent = "Applied";
        } else {
            setButtonBusy(button, false, "Submitting...", "Apply");
        }
    }
}

function initPostJobPage() {
    renderNavbar();
    document.getElementById("post-job-form")?.addEventListener("submit", postJob);
}

async function postJob(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const title = document.getElementById("job-title").value.trim();
    const company = document.getElementById("job-company").value.trim();
    const description = document.getElementById("job-description").value.trim();
    const location = document.getElementById("job-location").value.trim();
    const salaryRaw = document.getElementById("job-salary").value.trim();
    const jobType = document.getElementById("job-type").value;

    clearFieldErrors(form);
    clearAlert("post-alert");

    let hasError = false;

    if (!title || title.length < 3) {
        showFieldError("job-title", "Job title must be at least 3 characters");
        hasError = true;
    }
    if (!company) {
        showFieldError("job-company", "Company name is required");
        hasError = true;
    }
    if (!description || description.length < 10) {
        showFieldError("job-description", "Description must be at least 10 characters");
        hasError = true;
    }
    if (!location || location.length < 3) {
        showFieldError("job-location", "Location must be at least 3 characters");
        hasError = true;
    }
    if (salaryRaw && Number(salaryRaw) <= 0) {
        showFieldError("job-salary", "Salary must be greater than 0");
        hasError = true;
    }

    if (hasError) {
        return;
    }

    setButtonBusy(button, true, "Publishing...", "Publish job");

    try {
        await apiRequest("/jobs/", "POST", {
            title,
            company,
            description,
            location,
            salary: salaryRaw ? Number(salaryRaw) : null,
            job_type: jobType,
        });
        showAlert("post-alert", "Job published successfully. Redirecting to your posts...", "success");
        setTimeout(() => {
            window.location.href = "/my-posts";
        }, 900);
    } catch (error) {
        showAlert("post-alert", error.message, "error");
    } finally {
        setButtonBusy(button, false, "Publishing...", "Publish job");
    }
}

async function loadMyApplications() {
    renderNavbar();
    const container = document.getElementById("applications-list");
    if (!container) {
        return;
    }

    try {
        const applications = await apiRequest("/applications/my-applications");

        if (!applications.length) {
            container.innerHTML = renderEmptyState("inbox", "No applications yet", "Start by browsing jobs");
            refreshDynamicUi();
            return;
        }

        const uniqueJobIds = [...new Set(applications.map((item) => item.job_id))];
        const jobs = await Promise.all(uniqueJobIds.map(async (jobId) => {
            try {
                return await apiRequest(`/jobs/${jobId}`);
            } catch (error) {
                return { id: jobId, title: `Job #${jobId}`, company: "Unknown company" };
            }
        }));
        const jobsById = new Map(jobs.map((job) => [job.id, job]));

        container.innerHTML = `
            <div class="list-stack">
                ${applications.map((application) => {
                    const job = jobsById.get(application.job_id);
                    return `
                        <article class="list-card">
                            <div class="list-card__header">
                                <div>
                                    <h3 class="list-card__title">${escapeHtml(job.title)}</h3>
                                    <p class="list-card__subtitle">${escapeHtml(job.company)}</p>
                                </div>
                                <span class="${getStatusChipClass(application.status)}">${escapeHtml(titleCase(application.status))}</span>
                            </div>
                            <p class="list-card__description">${escapeHtml(application.cover_letter)}</p>
                            <div class="list-card__actions">
                                <a class="button button--secondary" href="/job/${application.job_id}">View role</a>
                                <button class="button button--danger" type="button" onclick="withdrawApplication(${application.id})">Withdraw</button>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;

        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function withdrawApplication(applicationId) {
    if (!window.confirm("Withdraw this application?")) {
        return;
    }

    try {
        await apiRequest(`/applications/${applicationId}`, "DELETE");
        loadMyApplications();
    } catch (error) {
        window.alert(error.message);
    }
}

async function loadMyPosts() {
    renderNavbar();
    const container = document.getElementById("posts-list");
    if (!container) {
        return;
    }

    try {
        const jobs = await apiRequest("/jobs/my/posts");

        if (!jobs.length) {
            container.innerHTML = renderEmptyState("briefcase", "No job posts yet", "Publish your first role to start hiring");
            refreshDynamicUi();
            return;
        }

        container.innerHTML = jobs.map((job) => {
            const actions = `
                <div class="list-card__actions">
                    <a class="button button--secondary" href="/job-applications/${job.id}">View applications</a>
                    <a class="button button--secondary" href="/job/${job.id}">Open role</a>
                    <button class="button button--danger" type="button" onclick="deleteMyJob(${job.id})">Delete</button>
                </div>
            `;
            return buildJobCard(job, actions);
        }).join("");

        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function deleteMyJob(jobId) {
    if (!window.confirm("Delete this job and its applications?")) {
        return;
    }

    try {
        await apiRequest(`/jobs/${jobId}`, "DELETE");
        loadMyPosts();
    } catch (error) {
        window.alert(error.message);
    }
}

function initJobApplicationsPage() {
    renderNavbar();
    const container = document.getElementById("applicants-list");
    const jobId = container?.dataset.jobId;
    if (jobId) {
        loadJobApplications(Number(jobId));
    }
}

async function loadJobApplications(jobId) {
    const container = document.getElementById("applicants-list");
    if (!container) {
        return;
    }

    try {
        const [job, applications] = await Promise.all([
            apiRequest(`/jobs/${jobId}`),
            apiRequest(`/applications/job/${jobId}`),
        ]);

        document.getElementById("job-title-header").textContent = `Applications for ${job.title}`;

        if (!applications.length) {
            container.innerHTML = renderEmptyState("users", "No applications yet", "Candidates will appear here once they apply");
            refreshDynamicUi();
            return;
        }

        container.innerHTML = `
            <div class="list-stack">
                ${applications.map((application) => `
                    <article class="list-card">
                        <div class="list-card__header">
                            <div>
                                <h3 class="list-card__title">Applicant #${escapeHtml(application.user_id)}</h3>
                                <p class="list-card__subtitle">Application status update</p>
                            </div>
                            <span class="${getStatusChipClass(application.status)}">${escapeHtml(titleCase(application.status))}</span>
                        </div>
                        <p class="list-card__description">${escapeHtml(application.cover_letter)}</p>
                        <div class="list-card__actions">
                            <button class="button button--success" type="button" onclick="updateApplicationStatus(${application.id}, 'accepted')" ${application.status === "accepted" ? "disabled" : ""}>Accept</button>
                            <button class="button button--danger" type="button" onclick="updateApplicationStatus(${application.id}, 'rejected')" ${application.status === "rejected" ? "disabled" : ""}>Reject</button>
                        </div>
                    </article>
                `).join("")}
            </div>
        `;

        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function updateApplicationStatus(applicationId, status) {
    try {
        await apiRequest(`/applications/${applicationId}/status`, "PUT", { status });
        const container = document.getElementById("applicants-list");
        loadJobApplications(Number(container.dataset.jobId));
    } catch (error) {
        window.alert(error.message);
    }
}

async function loadProfile() {
    renderNavbar();
    const container = document.getElementById("profile-content");
    if (!container) {
        return;
    }

    try {
        const profile = await apiRequest("/user/me");
        setUserData(profile);

        container.innerHTML = `
            <div class="profile-layout">
                <article class="summary-card profile-card">
                    <div class="profile-card__hero">
                        <div class="profile-card__avatar">${escapeHtml(getInitial(profile.username))}</div>
                        <div>
                            <h2 class="profile-card__name">${escapeHtml(profile.username)}</h2>
                            <p class="profile-card__email">${escapeHtml(profile.email)}</p>
                        </div>
                    </div>
                    <div class="detail-list">
                        <div class="detail-list__row">
                            <span class="detail-list__label">Role</span>
                            <span class="detail-list__value"><span class="${getRoleBadgeClass(profile.role)}">${escapeHtml(titleCase(profile.role))}</span></span>
                        </div>
                        ${profile.company_name ? `
                            <div class="detail-list__row">
                                <span class="detail-list__label">Company</span>
                                <span class="detail-list__value">${escapeHtml(profile.company_name)}</span>
                            </div>
                        ` : ""}
                        <div class="detail-list__row">
                            <span class="detail-list__label">Account status</span>
                            <span class="detail-list__value"><span class="${getStatusChipClass(profile.is_active ? "active" : "inactive")}">${profile.is_active ? "Active" : "Inactive"}</span></span>
                        </div>
                    </div>
                </article>

                <form id="password-form" class="panel-form" novalidate>
                    <h2>Change password</h2>
                    <div id="password-alert" class="form-message" aria-live="polite"></div>

                    <div class="form-field">
                        <label class="form-label" for="old-password">Current password</label>
                        <div class="input-shell">
                            <input class="form-input" type="password" id="old-password" autocomplete="current-password" placeholder="Enter your current password">
                            <button class="input-icon-button" type="button" data-password-toggle="old-password" aria-label="Show password">
                                <i data-lucide="eye"></i>
                            </button>
                        </div>
                        <p class="field-error" id="old-password-error" aria-live="polite"></p>
                    </div>

                    <div class="form-field">
                        <label class="form-label" for="new-password">New password</label>
                        <div class="input-shell">
                            <input class="form-input" type="password" id="new-password" autocomplete="new-password" placeholder="Choose a new password">
                            <button class="input-icon-button" type="button" data-password-toggle="new-password" aria-label="Show password">
                                <i data-lucide="eye"></i>
                            </button>
                        </div>
                        <p class="field-error" id="new-password-error" aria-live="polite"></p>
                    </div>

                    <button class="button button--primary" type="submit">Update password</button>
                </form>
            </div>
        `;

        document.getElementById("password-form")?.addEventListener("submit", changePassword);
        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function changePassword(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const oldPassword = document.getElementById("old-password").value;
    const newPassword = document.getElementById("new-password").value;

    clearFieldErrors(form);
    clearAlert("password-alert");

    let hasError = false;
    if (!oldPassword || oldPassword.length < 6) {
        showFieldError("old-password", "Current password must be at least 6 characters");
        hasError = true;
    }
    if (!newPassword || newPassword.length < 6) {
        showFieldError("new-password", "New password must be at least 6 characters");
        hasError = true;
    }
    if (oldPassword && newPassword && oldPassword === newPassword) {
        showFieldError("new-password", "New password must be different");
        hasError = true;
    }

    if (hasError) {
        return;
    }

    setButtonBusy(button, true, "Updating...", "Update password");

    try {
        await apiRequest("/user/me/password", "PUT", {
            old_password: oldPassword,
            new_password: newPassword,
        });
        showAlert("password-alert", "Password changed successfully.", "success");
        form.reset();
    } catch (error) {
        showAlert("password-alert", error.message, "error");
    } finally {
        setButtonBusy(button, false, "Updating...", "Update password");
    }
}

function initAdminPage() {
    renderNavbar();

    document.querySelectorAll("#admin-tabs [data-tab]").forEach((button) => {
        button.addEventListener("click", () => switchAdminTab(button.dataset.tab));
    });

    switchAdminTab("users");
}

async function loadAdminPanel() {
    switchAdminTab("users");
}

async function switchAdminTab(tab) {
    document.querySelectorAll("#admin-tabs [data-tab]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.tab === tab);
    });

    const container = document.getElementById("admin-content");
    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <span class="spinner"></span>
            <p>Loading admin data</p>
        </div>
    `;

    try {
        if (tab === "users") {
            const users = await apiRequest("/admin/users");
            container.innerHTML = `
                <div class="table-shell">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map((user) => `
                                <tr>
                                    <td>${escapeHtml(user.id)}</td>
                                    <td>${escapeHtml(user.username)}</td>
                                    <td>${escapeHtml(user.email)}</td>
                                    <td><span class="${getRoleBadgeClass(user.role)}">${escapeHtml(titleCase(user.role))}</span></td>
                                    <td><span class="${getStatusChipClass(user.is_active ? "active" : "inactive")}">${user.is_active ? "Active" : "Inactive"}</span></td>
                                    <td>
                                        <div class="data-table__actions">
                                            ${user.role !== "admin"
                                                ? `<button class="button ${user.is_active ? "button--danger" : "button--success"}" type="button" onclick="toggleUserStatus(${user.id}, ${user.is_active})">${user.is_active ? "Deactivate" : "Activate"}</button>`
                                                : '<span class="muted">Protected</span>'}
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (tab === "jobs") {
            const jobs = await apiRequest("/admin/jobs");
            container.innerHTML = `
                <div class="table-shell">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Company</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${jobs.map((job) => `
                                <tr>
                                    <td>${escapeHtml(job.id)}</td>
                                    <td>${escapeHtml(job.title)}</td>
                                    <td>${escapeHtml(job.company)}</td>
                                    <td>${escapeHtml(job.location)}</td>
                                    <td><span class="${getStatusChipClass(job.is_active ? "active" : "inactive")}">${job.is_active ? "Active" : "Inactive"}</span></td>
                                    <td>
                                        <div class="data-table__actions">
                                            <button class="button button--danger" type="button" onclick="adminDeleteJob(${job.id})">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            const applications = await apiRequest("/admin/applications");
            container.innerHTML = `
                <div class="table-shell">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Job</th>
                                <th>User</th>
                                <th>Status</th>
                                <th>Cover Letter</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${applications.map((application) => `
                                <tr>
                                    <td>${escapeHtml(application.id)}</td>
                                    <td>${escapeHtml(application.job_id)}</td>
                                    <td>${escapeHtml(application.user_id)}</td>
                                    <td><span class="${getStatusChipClass(application.status)}">${escapeHtml(titleCase(application.status))}</span></td>
                                    <td>${escapeHtml(application.cover_letter)}</td>
                                    <td>
                                        <div class="data-table__actions">
                                            <button class="button button--danger" type="button" onclick="adminDeleteApp(${application.id})">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        refreshDynamicUi();
    } catch (error) {
        container.innerHTML = `<div class="form-message form-message--error is-visible">${escapeHtml(error.message)}</div>`;
    }
}

async function toggleUserStatus(userId, isActive) {
    const action = isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }

    try {
        await apiRequest(`/admin/users/${userId}/${action}`, "PUT");
        switchAdminTab("users");
    } catch (error) {
        window.alert(error.message);
    }
}

async function adminDeleteJob(jobId) {
    if (!window.confirm("Delete this job and all related applications?")) {
        return;
    }

    try {
        await apiRequest(`/admin/jobs/${jobId}`, "DELETE");
        switchAdminTab("jobs");
    } catch (error) {
        window.alert(error.message);
    }
}

async function adminDeleteApp(applicationId) {
    if (!window.confirm("Delete this application?")) {
        return;
    }

    try {
        await apiRequest(`/admin/applications/${applicationId}`, "DELETE");
        switchAdminTab("applications");
    } catch (error) {
        window.alert(error.message);
    }
}
