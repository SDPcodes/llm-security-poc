CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id)
);

-- Sample data
INSERT INTO users (email, password, role) VALUES ('admin@example.com', '$2a$10$e0MYzXyjpJS7Pd0RVvHwHeFX8G1VfT1u3xq2Wz2uAO3v6FZ4zQXhG', 'admin');
INSERT INTO users (email, password, role) VALUES ('member@example.com', '$2a$10$e0MYzXyjpJS7Pd0RVvHwHeFX8G1VfT1u3xq2Wz2uAO3v6FZ4zQXhG', 'member');
INSERT INTO projects (name, owner_id) VALUES ('Project 1', 2);
INSERT INTO projects (name, owner_id) VALUES ('Project 2', 2);
