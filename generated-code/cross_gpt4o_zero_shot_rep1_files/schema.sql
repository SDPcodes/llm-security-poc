CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  data BYTEA NOT NULL,
  owner_id INTEGER REFERENCES users(id)
);

-- You can insert a test user with an encrypted password like this:
-- INSERT INTO users (email, password) VALUES ('test@example.com', '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXX');
-- The password should be encrypted using bcrypt before insertion.
