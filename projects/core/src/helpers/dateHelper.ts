export const getTodayRange = () => {
    const [start, end] = [new Date(), new Date()];

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    return [start, end];
};
