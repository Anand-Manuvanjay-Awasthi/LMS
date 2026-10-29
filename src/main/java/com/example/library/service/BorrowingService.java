package com.example.library.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.library.dto.BorrowBookRequest;
import com.example.library.dto.BorrowingRecordResponse;
import com.example.library.entity.Book;
import com.example.library.entity.BorrowingRecord;
import com.example.library.entity.Member;
import com.example.library.exception.ConflictException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookRepository;
import com.example.library.repository.BorrowingRecordRepository;
import com.example.library.repository.MemberRepository;

@Service
public class BorrowingService {

    private final BookRepository bookRepository;
    private final MemberRepository memberRepository;
    private final BorrowingRecordRepository borrowingRecordRepository;

    public BorrowingService(BookRepository bookRepository, MemberRepository memberRepository,
                            BorrowingRecordRepository borrowingRecordRepository) {
        this.bookRepository = bookRepository;
        this.memberRepository = memberRepository;
        this.borrowingRecordRepository = borrowingRecordRepository;
    }

    // Both the record and book availability are saved together, or neither is saved.
    @Transactional
    public BorrowingRecordResponse borrowBook(BorrowBookRequest request) {
        Book book = findBook(request.getBookId());
        Member member = findMember(request.getMemberId());

        if (!book.isAvailable()) {
            throw new ConflictException("This book is currently borrowed and cannot be borrowed again.");
        }

        book.setAvailable(false);

        BorrowingRecord record = new BorrowingRecord();
        record.setBook(book);
        record.setMember(member);
        record.setBorrowedAt(LocalDateTime.now());

        borrowingRecordRepository.save(record);
        bookRepository.save(book);
        return toResponse(record);
    }

    // This transaction prevents a partial return if a database operation fails.
    @Transactional
    public BorrowingRecordResponse returnBook(Long recordId) {
        BorrowingRecord record = borrowingRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Borrowing record with ID " + recordId + " was not found."));

        if (record.getReturnedAt() != null) {
            throw new ConflictException("This borrowing record has already been returned.");
        }

        record.setReturnedAt(LocalDateTime.now());
        record.getBook().setAvailable(true);

        borrowingRecordRepository.save(record);
        bookRepository.save(record.getBook());
        return toResponse(record);
    }

    @Transactional(readOnly = true)
    public List<BorrowingRecordResponse> getAllBorrowingRecords() {
        List<BorrowingRecord> records = borrowingRecordRepository.findAllByOrderByBorrowedAtDesc();
        List<BorrowingRecordResponse> responses = new ArrayList<>();

        for (BorrowingRecord record : records) {
            responses.add(toResponse(record));
        }
        return responses;
    }

    private Book findBook(Long bookId) {
        return bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book with ID " + bookId + " was not found."));
    }

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member with ID " + memberId + " was not found."));
    }

    private BorrowingRecordResponse toResponse(BorrowingRecord record) {
        BorrowingRecordResponse response = new BorrowingRecordResponse();
        response.setId(record.getId());
        response.setBookId(record.getBook().getId());
        response.setBookTitle(record.getBook().getTitle());
        response.setMemberId(record.getMember().getId());
        response.setMemberName(record.getMember().getFirstName() + " " + record.getMember().getLastName());
        response.setBorrowedAt(record.getBorrowedAt());
        response.setReturnedAt(record.getReturnedAt());
        return response;
    }
}
