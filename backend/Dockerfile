# Stage 1 — Build the jar
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2 — Run the jar
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/action-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8081
ENTRYPOINT ["sh", "-c", "echo DATABASE_URL=$DATABASE_URL && java -jar app.jar"]