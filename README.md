# Bidora

A live web-based auction platform connecting sellers, buyers, and drivers.
Built with Spring Boot (backend) and React (frontend).

## Project Structure

## Tech Stack

**Backend**
- Java 21 + Spring Boot 4
- PostgreSQL
- JWT Authentication
- WebSocket (STOMP) for live bidding
- PayFast payment gateway with escrow

**Frontend**
- React 18
- React Router
- Axios
- STOMP WebSocket
- CSS Modules

## Features
- Live real-time bidding
- Role-based access (Buyer, Seller, Driver, Admin)
- Escrow payment system via PayFast
- Delivery tracking with status updates
- Automatic payment release on delivery confirmation
- Auction auto-close scheduler

---

## Backend Setup

1. Navigate to the `backend` folder
2. Copy `src/main/resources/application.properties.example`
   to `src/main/resources/application.properties`
3. Fill in your values:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/auction_db
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
jwt.secret=your_jwt_secret
payfast.merchant-id=your_merchant_id
payfast.merchant-key=your_merchant_key
payfast.passphrase=your_passphrase
```

4. Create a PostgreSQL database named `auction_db`
5. Run the backend:

```bash
mvn spring-boot:run
```

API runs on `http://localhost:8081`

---

## Frontend Setup

1. Navigate to the `frontend` folder
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in:

4. Start the frontend:

```bash
npm start
```

App runs on `http://localhost:3000`

---

## Running the full app

Start the backend first, then the frontend. Both must be running simultaneously.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

## License
MIT
