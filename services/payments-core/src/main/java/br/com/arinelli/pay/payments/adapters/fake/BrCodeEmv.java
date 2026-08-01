package br.com.arinelli.pay.payments.adapters.fake;

import java.math.BigDecimal;

/**
 * Gerador mínimo de BR Code (EMV-QRCPS) estático com CRC16/CCITT-FALSE válido.
 * Suficiente para o FakePixProvider emitir payloads que passam em validadores.
 */
final class BrCodeEmv {

    private BrCodeEmv() {
    }

    static String payload(String pixKey, BigDecimal amount, String merchantName, String city, String txid) {
        String merchantAccount = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", pixKey);
        String additional = tlv("05", txid);
        String semCrc = tlv("00", "01")
                + tlv("26", merchantAccount)
                + tlv("52", "0000")
                + tlv("53", "986")
                + tlv("54", amount.toPlainString())
                + tlv("58", "BR")
                + tlv("59", merchantName)
                + tlv("60", city)
                + tlv("62", additional)
                + "6304";
        return semCrc + crc16(semCrc);
    }

    private static String tlv(String id, String value) {
        return id + "%02d".formatted(value.length()) + value;
    }

    /** CRC16/CCITT-FALSE: poly 0x1021, init 0xFFFF, sem reflexão, xorout 0x0000. */
    static String crc16(String input) {
        int crc = 0xFFFF;
        for (byte b : input.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return "%04X".formatted(crc);
    }
}
