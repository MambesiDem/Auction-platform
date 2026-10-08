package com.mambesi.action.payment;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
class PayfastClientTest {
 @Test void duplicateFieldsRejected(){assertThrows(IllegalArgumentException.class,()->new PayfastClient().parse("m_payment_id=a&m_payment_id=b"));}
 @Test void signatureCheckRejectsBeforeNetwork(){PayfastClient client=new PayfastClient();ReflectionTestUtils.setField(client,"merchantId","10000100");ReflectionTestUtils.setField(client,"passphrase","secret");var fields=client.parse("merchant_id=10000100&amount_gross=100.00&signature=forged");assertThrows(SecurityException.class,()->client.validate(fields,"127.0.0.1",null,100));}
 @Test void outgoingBlankFieldsOmittedAndPassphraseEncoded(){var fields=new java.util.LinkedHashMap<String,String>();fields.put("amount","100.00");fields.put("name_last","");assertEquals("amount=100.00",PayfastClient.encode(fields,true));assertEquals("0d704a230a7a78b676845f4a717d9e6b",PayfastClient.sign("amount=100.00","x &y"));}
 @Test void liveCheckoutFailsClosedWithoutApproval(){PayfastClient client=new PayfastClient();ReflectionTestUtils.setField(client,"sandbox",false);assertThrows(IllegalStateException.class,client::requireCheckoutAllowed);}
}
