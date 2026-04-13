package com.prodplan.user;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
public class UserApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserApplication.class, args);
    }

    @Bean
    public CommandLineRunner dropEmailConstraint(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Try dropping 'email' index if MySQL created it with that name
                jdbcTemplate.execute("ALTER TABLE users DROP INDEX email");
                System.out.println("SQL EXECUTION: Dropped 'email' index from 'users' table.");
            } catch (Exception e) {
                try {
                    // Hibernate often names unique constraints UK_<random>
                    // We can attempt to drop it if we knew the name, but since we don't 
                    // and 'mysql' command isn't in path, we'll try to find it via JDBC
                    String ukName = jdbcTemplate.queryForObject(
                        "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE " +
                        "WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'email' " +
                        "AND CONSTRAINT_NAME <> 'PRIMARY' LIMIT 1", String.class);
                    if (ukName != null) {
                        jdbcTemplate.execute("ALTER TABLE users DROP INDEX " + ukName);
                        System.out.println("SQL EXECUTION: Dropped '" + ukName + "' index from 'users' table.");
                    }
                } catch (Exception e2) {
                    System.out.println("SQL EXECUTION: Email index not found or already dropped.");
                }
            }
        };
    }
}
