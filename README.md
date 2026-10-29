# Library Management System

A small, beginner-friendly Library Management System with a plain HTML, CSS, and JavaScript frontend. It uses Java 17, Spring Boot, Spring Web, Spring Data JPA, and MySQL. The frontend is served by Spring Boot at `http://localhost:8080`; the REST API can also be tested with Postman or curl.

## Requirements

- Java 17 or newer
- MySQL Server 8+
- Maven 3.9+ (or an IDE with Maven support)

## Set up MySQL

Run the following SQL as a MySQL administrator. The application creates its own tables when it starts.

```sql
CREATE DATABASE library_management_db;

CREATE USER 'library_user'@'localhost' IDENTIFIED BY 'choose_a_strong_password';
GRANT ALL PRIVILEGES ON library_management_db.* TO 'library_user'@'localhost';
FLUSH PRIVILEGES;
```

`src/main/resources/application.properties` contains the connection settings:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/library_management_db?useSSL=false&serverTimezone=UTC
spring.datasource.username=library_user
spring.datasource.password=${LIBRARY_DB_PASSWORD}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

The password is deliberately not stored in the project. Set `LIBRARY_DB_PASSWORD` before running the program.

PowerShell (current terminal only):

```powershell
$env:LIBRARY_DB_PASSWORD = "choose_a_strong_password"
```

Windows Command Prompt (current terminal only):

```cmd
set LIBRARY_DB_PASSWORD=choose_a_strong_password
```

## Run the application

From the project directory:

```bash
mvn spring-boot:run
```

The application starts at `http://localhost:8080`. Open that address in a browser to use the simple management page. Do not open `index.html` from a different server if you can avoid it: opening the Spring Boot URL keeps the page and API on the same address. The page also has a local-development fallback to `http://localhost:8080` and the API permits browser requests from common local preview URLs. Hibernate uses `spring.jpa.hibernate.ddl-auto=update`, so it creates or updates the `books`, `members`, and `borrowing_records` tables based on the entity classes. This is convenient for a learning project; production applications normally manage schema changes more deliberately.

To build a JAR:

```bash
mvn clean package
java -jar target/library-management-system-0.0.1-SNAPSHOT.jar
```

## Project structure

```text
src/main/java/com/example/library
├── controller   HTTP endpoints and status codes
├── dto          Small request/response classes for borrowing
├── entity       Database table mappings: Book, Member, BorrowingRecord
├── exception    Central error handling
├── repository   Spring Data JPA database interfaces
└── service      Application rules, including borrow/return transactions

src/main/resources/static
├── index.html    Basic browser page
├── style.css     Plain form-style layout
└── app.js        Fetch calls to the Spring Boot REST API
```

## How the database pieces fit together

- **JDBC** is Java's low-level standard API for opening a database connection and sending SQL. The MySQL JDBC driver (`com.mysql:mysql-connector-j`) lets Java talk to MySQL.
- **JPA** (Java Persistence API) is a Java specification for representing tables as Java objects, such as `Book` and `Member`.
- **Hibernate** is the JPA implementation used by Spring Boot here. It turns entity operations into SQL and manages table mapping.
- **Spring Data JPA** adds convenient repository interfaces. Extending `JpaRepository<Book, Long>` supplies common operations such as `save`, `findAll`, `findById`, and `delete` without writing SQL manually.

## Important annotations

- `@SpringBootApplication` starts Spring Boot and component scanning.
- `@Entity` marks a Java class as a database table mapping; `@Id` and `@GeneratedValue` identify an auto-generated primary key.
- `@ManyToOne` says many borrowing records can belong to one book or one member.
- `@RestController` exposes JSON HTTP endpoints. `@RequestMapping` sets their shared URL path.
- `@Service` holds application rules, while `@Repository` behavior is supplied by Spring Data's `JpaRepository`.
- `@Valid` runs validation such as `@NotBlank` and `@Email` on request bodies.
- `@Transactional` makes borrowing and returning atomic: if part of either operation fails, its database changes are rolled back together.
- `@RestControllerAdvice` applies one centralized error format across controllers.

## API endpoints

Base URL: `http://localhost:8080`

| Area | Method | URL | Success status | Purpose |
| --- | --- | --- | --- | --- |
| Books | POST | `/api/books` | 201 | Add a book |
| Books | GET | `/api/books` | 200 | List all books |
| Books | GET | `/api/books/{id}` | 200 | Get one book |
| Books | PUT | `/api/books/{id}` | 200 | Update book details |
| Books | DELETE | `/api/books/{id}` | 204 | Delete a book |
| Books | GET | `/api/books/search?title=clean&author=martin` | 200 | Search by title and/or author |
| Books | GET | `/api/books/available` | 200 | List available books |
| Members | POST | `/api/members` | 201 | Register a member |
| Members | GET | `/api/members` | 200 | List members |
| Members | GET | `/api/members/{id}` | 200 | Get one member |
| Members | PUT | `/api/members/{id}` | 200 | Update a member |
| Members | DELETE | `/api/members/{id}` | 204 | Delete a member |
| Borrowing | POST | `/api/borrowings` | 201 | Borrow an available book |
| Borrowing | PATCH | `/api/borrowings/{id}/return` | 200 | Return a borrowed book |
| Borrowing | GET | `/api/borrowings` | 200 | List borrowing records |

For `POST` and `PUT`, use `Content-Type: application/json` in Postman. `available` is returned with a book, but it is managed by the borrowing flow: a new book starts available, borrowing changes it to `false`, and returning changes it back to `true`.

## Sample requests and responses

### Add a book

`POST /api/books`

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "publishedYear": 2008
}
```

Response (`201 Created`):

```json
{
  "id": 1,
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "publishedYear": 2008,
  "available": true
}
```

### Register a member

`POST /api/members`

```json
{
  "firstName": "Asha",
  "lastName": "Sharma",
  "email": "asha@example.com"
}
```

Response (`201 Created`):

```json
{
  "id": 1,
  "firstName": "Asha",
  "lastName": "Sharma",
  "email": "asha@example.com"
}
```

### Borrow a book

`POST /api/borrowings`

```json
{
  "bookId": 1,
  "memberId": 1
}
```

Response (`201 Created`):

```json
{
  "id": 1,
  "bookId": 1,
  "bookTitle": "Clean Code",
  "memberId": 1,
  "memberName": "Asha Sharma",
  "borrowedAt": "2026-10-27T10:30:00",
  "returnedAt": null
}
```

### Return a book

`PATCH /api/borrowings/1/return`

No request body is needed. The response is the borrowing record with a non-null `returnedAt` time. Calling the same return endpoint again returns `409 Conflict`.

### Validation error example

Submitting a book with an empty title returns `400 Bad Request` in this format:

```json
{
  "timestamp": "2026-10-27T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/books",
  "validationErrors": {
    "title": "Title is required"
  }
}
```

Missing resources return `404 Not Found`; trying to borrow an unavailable book or returning the same record twice returns `409 Conflict`.

## How one request travels to MySQL

For example, when Postman sends `POST /api/borrowings`:

1. `BorrowingController` receives the HTTP request, reads JSON into `BorrowBookRequest`, and validates that both IDs were supplied.
2. `BorrowingService` finds the book and member through their repositories. It checks that the book exists and is available.
3. Inside one `@Transactional` method, the service creates a `BorrowingRecord`, marks the book unavailable, and asks repositories to save both changes.
4. The Spring Data JPA repositories use Hibernate. Hibernate uses the MySQL JDBC driver to send the necessary SQL to MySQL.
5. MySQL commits the changes. The service builds a simple response object, and the controller returns it as JSON with `201 Created`.

If a book or member does not exist, or the book is already borrowed, the service throws a simple exception. `GlobalExceptionHandler` turns that into a consistent JSON error response.
