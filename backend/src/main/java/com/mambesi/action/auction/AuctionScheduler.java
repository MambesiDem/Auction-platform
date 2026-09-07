package com.mambesi.action.auction;

import com.mambesi.action.bid.BidRepository;
import com.mambesi.action.bid.BidMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class AuctionScheduler {

    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final AuctionService auctionService;

    public AuctionScheduler(AuctionRepository auctionRepository,
                            BidRepository bidRepository,
                            SimpMessagingTemplate messagingTemplate, AuctionService auctionService) {
        this.auctionRepository = auctionRepository;
        this.bidRepository = bidRepository;
        this.messagingTemplate = messagingTemplate;
        this.auctionService = auctionService;
    }

    // Runs every minute to check auctions
    // Close an auction its time is over
    @Scheduled(fixedRate = 60000)
    public void checkAuctions() {

        List<AuctionItem> auctions = auctionRepository.findAll();

        for (AuctionItem auction : auctions) {

            // Close expired active auctions
            if (auction.isActive()
                    && auction.getEndTime().isBefore(LocalDateTime.now())) {

                AuctionItem closed = auctionService.closeAuction(auction);

                BidMessage message = new BidMessage();
                message.setAuctionId(closed.getId().toString());
                message.setBidderEmail(
                        closed.getWinner() != null ? closed.getWinner().getEmail() : "NO_WINNER"
                );
                message.setAmount(
                        closed.getWinner() != null ? closed.getCurrentPrice() : 0
                );
                message.setTimestamp(LocalDateTime.now().toString());

                messagingTemplate.convertAndSend("/topic/auction-closed", message);
            }

            // Check payment deadline on closed auctions with a winner
            if (!auction.isActive()
                    && auction.getWinner() != null
                    && auction.getPaymentDeadline() != null
                    && auction.getPaymentDeadline().isBefore(LocalDateTime.now())) {

                auctionService.expirePaymentAndReassign(auction.getId());
            }
        }
    }
}