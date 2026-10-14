CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Insert a test user with hashed password
INSERT INTO users (username, password) VALUES ('testuser', '$2b$12$WzjA1U8T6L8hHCz5U1aJ9u2nD9wz5U8nQ2q9Jz5Wp5aJ9u2nD9wz5U');
-- The password is 'password' hashed using bcrypt with cost factor 12
