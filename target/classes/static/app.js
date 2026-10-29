const message = document.getElementById("message");
const memberForm = document.getElementById("member-form");
const bookForm = document.getElementById("book-form");
const borrowingForm = document.getElementById("borrowing-form");

// When this page is served by Spring Boot on port 8080, relative URLs are used.
// When it is opened from an IDE preview or directly as a file, use the API server.
const apiBaseUrl = window.location.port === "8080" ? "" : "http://localhost:8080";

function showMessage(text, isError) {
    message.textContent = text;
    message.className = isError ? "message error" : "message success";
}

async function apiRequest(url, options) {
    const response = await fetch(apiBaseUrl + url, options);

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const responseBody = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
        const errorMessage = responseBody && responseBody.message
            ? responseBody.message
            : `API request failed with status ${response.status}. Start Spring Boot at http://localhost:8080.`;
        throw new Error(errorMessage);
    }

    if (responseBody === null) {
        throw new Error("The API returned a non-JSON response. Check that Spring Boot is running on port 8080.");
    }

    return responseBody;
}

function requestOptions(method, data) {
    return {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    };
}

function clearMemberForm() {
    document.getElementById("member-id").value = "";
    document.getElementById("first-name").value = "";
    document.getElementById("last-name").value = "";
    document.getElementById("member-email").value = "";
}

function clearBookForm() {
    document.getElementById("book-id").value = "";
    document.getElementById("book-title").value = "";
    document.getElementById("book-author").value = "";
    document.getElementById("book-isbn").value = "";
    document.getElementById("published-year").value = "";
    document.getElementById("book-availability").textContent = "New books are available.";
}

async function findMember() {
    const memberId = document.getElementById("member-id").value;
    if (!memberId) {
        showMessage("Enter a member ID before searching.", true);
        return;
    }

    try {
        const member = await apiRequest(`/api/members/${memberId}`);
        document.getElementById("first-name").value = member.firstName;
        document.getElementById("last-name").value = member.lastName;
        document.getElementById("member-email").value = member.email;
        showMessage("Member found.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function saveMember(event) {
    event.preventDefault();

    const memberId = document.getElementById("member-id").value;
    const member = {
        firstName: document.getElementById("first-name").value.trim(),
        lastName: document.getElementById("last-name").value.trim(),
        email: document.getElementById("member-email").value.trim()
    };

    try {
        if (memberId) {
            await apiRequest(`/api/members/${memberId}`, requestOptions("PUT", member));
            showMessage("Member updated.");
        } else {
            const savedMember = await apiRequest("/api/members", requestOptions("POST", member));
            document.getElementById("member-id").value = savedMember.id;
            showMessage("Member saved. Member ID: " + savedMember.id);
        }
        await loadAllData();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function findBook() {
    const bookId = document.getElementById("book-id").value;
    if (!bookId) {
        showMessage("Enter a book ID before searching.", true);
        return;
    }

    try {
        const book = await apiRequest(`/api/books/${bookId}`);
        document.getElementById("book-title").value = book.title;
        document.getElementById("book-author").value = book.author;
        document.getElementById("book-isbn").value = book.isbn || "";
        document.getElementById("published-year").value = book.publishedYear || "";
        document.getElementById("book-availability").textContent = book.available ? "Available" : "Borrowed";
        showMessage("Book found.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function saveBook(event) {
    event.preventDefault();

    const bookId = document.getElementById("book-id").value;
    const publishedYearValue = document.getElementById("published-year").value;
    const book = {
        title: document.getElementById("book-title").value.trim(),
        author: document.getElementById("book-author").value.trim(),
        isbn: document.getElementById("book-isbn").value.trim() || null,
        publishedYear: publishedYearValue ? Number(publishedYearValue) : null
    };

    try {
        if (bookId) {
            await apiRequest(`/api/books/${bookId}`, requestOptions("PUT", book));
            showMessage("Book updated.");
        } else {
            const savedBook = await apiRequest("/api/books", requestOptions("POST", book));
            document.getElementById("book-id").value = savedBook.id;
            document.getElementById("book-availability").textContent = "Available";
            showMessage("Book saved. Book ID: " + savedBook.id);
        }
        await loadAllData();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function borrowBook(event) {
    event.preventDefault();

    const bookId = document.getElementById("borrow-book").value;
    const memberId = document.getElementById("borrow-member").value;
    if (!bookId || !memberId) {
        showMessage("Select both a book and a member.", true);
        return;
    }

    try {
        const record = await apiRequest("/api/borrowings", requestOptions("POST", {
            bookId: Number(bookId),
            memberId: Number(memberId)
        }));
        showMessage("Book borrowed. Record ID: " + record.id);
        await loadAllData();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function returnBook(recordId) {
    try {
        await apiRequest(`/api/borrowings/${recordId}/return`, { method: "PATCH" });
        showMessage("Book returned.");
        await loadAllData();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function deleteBook(bookId) {
    if (!window.confirm("Delete this book?")) {
        return;
    }

    try {
        await apiRequest(`/api/books/${bookId}`, { method: "DELETE" });
        clearBookForm();
        showMessage("Book deleted.");
        await loadAllData();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function deleteMember(memberId) {
    if (!window.confirm("Delete this member?")) {
        return;
    }

    try {
        await apiRequest(`/api/members/${memberId}`, { method: "DELETE" });
        clearMemberForm();
        showMessage("Member deleted.");
        await loadAllData();
    } catch (error) {
        showMessage(error.message, true);
    }
}

function fillBookChoices(books) {
    const select = document.getElementById("borrow-book");
    select.innerHTML = '<option value="">Choose an available book</option>';
    books.filter(book => book.available).forEach(book => {
        const option = document.createElement("option");
        option.value = book.id;
        option.textContent = `${book.id} - ${book.title}`;
        select.appendChild(option);
    });
}

function fillMemberChoices(members) {
    const select = document.getElementById("borrow-member");
    select.innerHTML = '<option value="">Choose a member</option>';
    members.forEach(member => {
        const option = document.createElement("option");
        option.value = member.id;
        option.textContent = `${member.id} - ${member.firstName} ${member.lastName}`;
        select.appendChild(option);
    });
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value || "";
    return element.innerHTML;
}

function renderBooks(books) {
    const body = document.getElementById("books-table-body");
    if (books.length === 0) {
        body.innerHTML = '<tr><td class="empty-row" colspan="5">No books found.</td></tr>';
        return;
    }

    body.innerHTML = books.map(book => `
        <tr>
            <td>${book.id}</td>
            <td>${escapeHtml(book.title)}</td>
            <td>${escapeHtml(book.author)}</td>
            <td>${book.available ? "Yes" : "No"}</td>
            <td>
                <button type="button" onclick="loadBookIntoForm(${book.id})">EDIT</button>
                <button type="button" onclick="deleteBook(${book.id})">DELETE</button>
            </td>
        </tr>`).join("");
}

function renderMembers(members) {
    const body = document.getElementById("members-table-body");
    if (members.length === 0) {
        body.innerHTML = '<tr><td class="empty-row" colspan="4">No members found.</td></tr>';
        return;
    }

    body.innerHTML = members.map(member => `
        <tr>
            <td>${member.id}</td>
            <td>${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)}</td>
            <td>${escapeHtml(member.email)}</td>
            <td>
                <button type="button" onclick="loadMemberIntoForm(${member.id})">EDIT</button>
                <button type="button" onclick="deleteMember(${member.id})">DELETE</button>
            </td>
        </tr>`).join("");
}

function formatDate(dateText) {
    return dateText ? dateText.replace("T", " ").substring(0, 16) : "-";
}

function renderBorrowings(records) {
    const body = document.getElementById("borrowings-table-body");
    if (records.length === 0) {
        body.innerHTML = '<tr><td class="empty-row" colspan="6">No borrowing records found.</td></tr>';
        return;
    }

    body.innerHTML = records.map(record => `
        <tr>
            <td>${record.id}</td>
            <td>${escapeHtml(record.bookTitle)}</td>
            <td>${escapeHtml(record.memberName)}</td>
            <td>${formatDate(record.borrowedAt)}</td>
            <td>${formatDate(record.returnedAt)}</td>
            <td>${record.returnedAt ? "-" : `<button type="button" onclick="returnBook(${record.id})">RETURN</button>`}</td>
        </tr>`).join("");
}

async function loadBookIntoForm(bookId) {
    document.getElementById("book-id").value = bookId;
    await findBook();
    window.scrollTo(0, 0);
}

async function loadMemberIntoForm(memberId) {
    document.getElementById("member-id").value = memberId;
    await findMember();
    window.scrollTo(0, 0);
}

async function loadAllData() {
    try {
        const [books, members, records] = await Promise.all([
            apiRequest("/api/books"),
            apiRequest("/api/members"),
            apiRequest("/api/borrowings")
        ]);
        fillBookChoices(books);
        fillMemberChoices(members);
        renderBooks(books);
        renderMembers(members);
        renderBorrowings(records);
    } catch (error) {
        showMessage("Could not load data: " + error.message, true);
    }
}

document.getElementById("find-member-button").addEventListener("click", findMember);
document.getElementById("clear-member-button").addEventListener("click", clearMemberForm);
document.getElementById("find-book-button").addEventListener("click", findBook);
document.getElementById("clear-book-button").addEventListener("click", clearBookForm);
memberForm.addEventListener("submit", saveMember);
bookForm.addEventListener("submit", saveBook);
borrowingForm.addEventListener("submit", borrowBook);

document.getElementById("borrow-date").value = new Date().toISOString().slice(0, 10);
loadAllData();
