-- Sample SQL file for testing INSERT and SELECT parsing
CREATE TABLE IF NOT EXISTS sales (
  id INT PRIMARY KEY,
  product VARCHAR(50),
  amount DECIMAL(10,2),
  sale_date DATE
);

INSERT INTO sales (id, product, amount, sale_date) VALUES
(1, 'Widget A', 99.99, '2025-01-15'),
(2, 'Widget B', 149.50, '2025-01-16'),
(3, 'Widget A', 99.99, '2025-01-17');

INSERT INTO sales VALUES (4, 'Widget C', 199.00, '2025-01-18');
INSERT INTO sales VALUES (5, 'Widget B', 149.50, '2025-01-19');

SELECT id, product, amount, sale_date FROM sales WHERE amount > 100;

SELECT product, SUM(amount) as total FROM sales GROUP BY product ORDER BY total DESC;
