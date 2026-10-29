package com.example.library.controller;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.example.library.dto.BorrowBookRequest;
import com.example.library.dto.BorrowingRecordResponse;
import com.example.library.service.BorrowingService;

@RestController
@RequestMapping("/api/borrowings")
public class BorrowingController {

    private final BorrowingService borrowingService;

    public BorrowingController(BorrowingService borrowingService) {
        this.borrowingService = borrowingService;
    }

    @PostMapping
    public ResponseEntity<BorrowingRecordResponse> borrowBook(@Valid @RequestBody BorrowBookRequest request) {
        BorrowingRecordResponse record = borrowingService.borrowBook(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(record.getId())
                .toUri();
        return ResponseEntity.created(location).body(record);
    }

    @PatchMapping("/{id}/return")
    public BorrowingRecordResponse returnBook(@PathVariable Long id) {
        return borrowingService.returnBook(id);
    }

    @GetMapping
    public List<BorrowingRecordResponse> getAllBorrowingRecords() {
        return borrowingService.getAllBorrowingRecords();
    }
}
