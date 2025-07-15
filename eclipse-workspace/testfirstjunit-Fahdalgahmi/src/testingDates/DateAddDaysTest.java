package testingDates;

import static org.junit.Assert.*;
import org.junit.Test;

public class DateAddDaysTest {

    @Test
    public void stayInSameMonth() {
        Date startDate = new Date("June", 10, 2019);
        startDate.addOneDay();
        assertEquals(new Date("June", 11, 2019), startDate);
    }

    @Test
    public void stayInSameMonth2() {
        Date startDate = new Date("July", 1, 2024);
        assertEquals(new Date("July", 2, 2024), startDate.addOneDay());
    }

    @Test
    public void crossMonthBoundary() {
        Date startDate = new Date("April", 30, 2023);
        assertEquals(new Date("May", 1, 2023), startDate.addOneDay());
    }

    @Test
    public void crossToNextMonthEndOfJune() {
        Date startDate = new Date("June", 30, 2022);
        assertEquals(new Date("July", 1, 2022), startDate.addOneDay());
    }

    @Test
    public void crossYearBoundary() {
        Date startDate = new Date("December", 31, 2023);
        assertEquals(new Date("January", 1, 2024), startDate.addOneDay());
    }
}
