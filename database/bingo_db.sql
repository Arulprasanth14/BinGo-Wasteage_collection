CREATE DATABASE bingo_db;
\c bingo_db

-- Users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Workers table
CREATE TABLE workers (
    worker_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    status VARCHAR(20) CHECK (status IN ('AVAILABLE', 'BUSY')) DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Pickups table
CREATE TABLE pickups (
    pickup_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    waste_type VARCHAR(50) NOT NULL,
    location_text VARCHAR(255),
    status VARCHAR(20) CHECK (
        status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED')
    ) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pickup_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Assignments table
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    pickup_id INT NOT NULL,
    worker_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_pickup
        FOREIGN KEY (pickup_id)
        REFERENCES pickups(pickup_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_worker
        FOREIGN KEY (worker_id)
        REFERENCES workers(worker_id)
        ON DELETE CASCADE
);
-- Location logs table
CREATE TABLE location_logs (
    log_id SERIAL PRIMARY KEY,
    pickup_id INT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_location_pickup
        FOREIGN KEY (pickup_id)
        REFERENCES pickups(pickup_id)
        ON DELETE CASCADE
);
-- Status logs table
CREATE TABLE status_logs (
    status_log_id SERIAL PRIMARY KEY,
    pickup_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_pickup
        FOREIGN KEY (pickup_id)
        REFERENCES pickups(pickup_id)
        ON DELETE CASCADE
);
echo "# BinGo-Wasteage_collection" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Arulprasanth14/BinGo-Wasteage_collection.git
git push -u origin main