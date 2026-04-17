package com.prodplan.user.repository;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT u FROM User u WHERE (u.status IS NULL OR u.status != :status) AND u.email = :email")
    Optional<User> findByEmailAndStatusNot(@Param("email") String email, @Param("status") String status);

    @Query("SELECT u FROM User u WHERE (u.status IS NULL OR u.status != :status) AND u.pin = :pin")
    Optional<User> findByPinAndStatusNot(@Param("pin") String pin, @Param("status") String status);

    @Query("SELECT u FROM User u WHERE (u.status IS NULL OR u.status != :status) AND u.email = :email AND u.role = :role")
    Optional<User> findByEmailAndRoleAndStatusNot(@Param("email") String email, @Param("role") Role role, @Param("status") String status);

    @Query("SELECT u FROM User u WHERE (u.status IS NULL OR u.status != :status) AND u.email = :email AND u.pin = :pin")
    Optional<User> findByEmailAndPinAndStatusNot(@Param("email") String email, @Param("pin") String pin, @Param("status") String status);

    @Query("SELECT u FROM User u WHERE u.status IS NULL OR u.status != :status")
    java.util.List<User> findByStatusNot(@Param("status") String status);

    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :id")
    void updateUserStatus(@Param("id") Long id, @Param("status") String status);
}
