package com.mambesi.action.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.name:ConnSB}")
    private String appName;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.test-email-override:}")
    private String testEmailOverride;

    @Async
    public void sendEmail(String to, String subject, String body) {
        if (mailSender == null) {
            System.out.println("Mail not configured — skipping email to: " + to);
            return;
        }
        try {
            String recipient = (testEmailOverride != null && !testEmailOverride.isEmpty())
                    ? testEmailOverride : to;
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipient);
            message.setSubject("[" + appName + "] " + subject);
            message.setText(body);
            mailSender.send(message);
            System.out.println("Email sent to: " + recipient);
        } catch (Exception e) {
            System.out.println("Email failed to: " + to + " — " + e.getMessage());
        }
    }

    public void sendAuctionWonEmail(String buyerEmail, String itemTitle,
                                    double amount, int minutesToPay) {
        String subject = "You won: " + itemTitle;
        String body = "Congratulations!\n\n" +
                "You won the auction for \"" + itemTitle + "\" " +
                "with a bid of R" + String.format("%.2f", amount) + ".\n\n" +
                "You have " + minutesToPay + " minutes to complete your payment. " +
                "If payment is not received in time, the item will be offered to the next bidder.\n\n" +
                "Please log in to complete your payment:\n" +
                frontendUrl + "/buyer/dashboard\n\n" +
                "Thank you for using " + appName + ".";
        sendEmail(buyerEmail, subject, body);
    }

    public void sendPaymentConfirmedEmail(String buyerEmail, String itemTitle,
                                          double amount) {
        String subject = "Payment confirmed — " + itemTitle;
        String body = "Your payment has been received.\n\n" +
                "Item: " + itemTitle + "\n" +
                "Amount: R" + String.format("%.2f", amount) + "\n" +
                "Status: Held in escrow\n\n" +
                "Your funds are held securely and will be released to the seller " +
                "once your item has been delivered.\n\n" +
                "Track your delivery at:\n" +
                frontendUrl + "/buyer/dashboard\n\n" +
                "Thank you for using " + appName + ".";
        sendEmail(buyerEmail, subject, body);
    }

    public void sendSellerPaymentReceivedEmail(String sellerEmail, String itemTitle,
                                               double sellerAmount) {
        String subject = "Payment received for: " + itemTitle;
        String body = "Good news!\n\n" +
                "Payment for \"" + itemTitle + "\" has been received and is held in escrow.\n\n" +
                "Your earnings: R" + String.format("%.2f", sellerAmount) + " " +
                "(after 5% platform commission)\n\n" +
                "Funds will be released to you automatically once the buyer " +
                "confirms delivery of the item.\n\n" +
                "Please create a delivery request if you haven't already:\n" +
                frontendUrl + "/seller/dashboard\n\n" +
                "Thank you for using " + appName + ".";
        sendEmail(sellerEmail, subject, body);
    }

    public void sendDeliveryStatusEmail(String buyerEmail, String itemTitle,
                                        String status) {
        String subject = "Delivery update — " + itemTitle;
        String statusMessage = switch (status) {
            case "ACCEPTED"   -> "A driver has accepted your delivery job and will collect your item shortly.";
            case "PICKED_UP"  -> "Your item has been collected by the driver and is being prepared for delivery.";
            case "IN_TRANSIT" -> "Your item is on its way to you!";
            case "DELIVERED"  -> "Your item has been delivered. We hope you enjoy it!";
            default           -> "Your delivery status has been updated to: " + status;
        };
        String body = "Delivery update for \"" + itemTitle + "\":\n\n" +
                statusMessage + "\n\n" +
                "Track your delivery at:\n" +
                frontendUrl + "/buyer/dashboard\n\n" +
                "Thank you for using " + appName + ".";
        sendEmail(buyerEmail, subject, body);
    }
}