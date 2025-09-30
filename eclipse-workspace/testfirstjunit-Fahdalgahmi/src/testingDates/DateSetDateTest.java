package testingDates;

import static org.junit.Assert.*;
import org.junit.Test;

public class DateSetDateTest {

    @Test
    public void legalSetDate() {
        Date d = new Date(3, 5, 2023); // March 5, 2023
        d.setDate("April", 15, 2023);
        assertEquals(new Date("April", 15, 2023), d);
    }

    @Test
    public void illegalSetDate_Feb30() {
        Date d = new Date(2, 28, 2023); // Valid original date
        d.setDate("February", 30, 2023); // Invalid
        assertEquals(new Date("February", 28, 2023), d); // Should remain unchanged
    }

    @Test
    public void illegalSetDate_Nov31() {
        Date d = new Date(11, 30, 2023); // Valid original date
        d.setDate("November", 31, 2023); // Invalid
        assertEquals(new Date("November", 30, 2023), d); // Should remain unchanged
    }
}
