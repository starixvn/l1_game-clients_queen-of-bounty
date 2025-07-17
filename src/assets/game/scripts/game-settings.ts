export const GAME_NAME = "LuckyNeko";
export const settings = {
    id: 143,
    name: GAME_NAME,
    observerNamespace: GAME_NAME,
    tolgeeNamespaces: [GAME_NAME, "cascadingslot"],
    durations: {
        wholeRound: 14,
        lockingBet: 3,
        placingBet: 10,
        generatingResult: 0,
        startRound: 1,

        bigWinNotice: 5,
        normalWinNotice: 3,
        loseNotice: 1,
    },
    numberOfRoundHistory: 11,
    validateBalanceWhenBet: true,
    isMiniGame: false,
};
