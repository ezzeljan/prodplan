package com.prodplan.user.repository;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPin(String pin);
    Optional<User> findByEmailAndRole(String email, Role role);
    Optional<User> findByEmailAndPin(String email, String pin);
}
