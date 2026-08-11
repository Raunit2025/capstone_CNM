const mysql = require("mysql2/promise");
const logger = require("./logger").logger;

const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || "order_user",
  password: process.env.MYSQL_PASSWORD || "order_password",
  database: process.env.MYSQL_DATABASE || "order_db",
};

async function initDatabase(retries = 5) {
  while (retries) {
    try {
      const pool = mysql.createPool(dbConfig);

      await pool.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_email VARCHAR(255) NOT NULL,
                    total_amount DECIMAL(10,2) NOT NULL,
                    status VARCHAR(50) DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

      await pool.query(`
                CREATE TABLE IF NOT EXISTS order_item (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT NOT NULL,
                    cake_id VARCHAR(255) NOT NULL,
                    cake_name VARCHAR(255) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    quantity INT NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
                )
            `);

      await pool.query(`
          CREATE TABLE IF NOT EXISTS basket_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            cake_id VARCHAR(255) NOT NULL,
            cake_name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            quantity INT NOT NULL,
            UNIQUE KEY unique_user_cake (user_id, cake_id)
          )
      `);

      logger.info("MySQL Database tables initialized successfully");
      return pool;

    } catch (error) {
      logger.error(`Error in initializing mysql database, retrying... (${retries} left)`, {
        error: error.message,
      });
      retries -= 1;
      
      await new Promise((res) => setTimeout(res, 5000));

      if(retries === 0){
        logger.error('MySQL Database initialization completely Failed..., Exiting Process');
        process.exit(1);
      }
      throw error;
    }
  }
}

module.exports.initDatabase = initDatabase;
