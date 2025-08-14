import gc from "@sg/game-client-base";
import { GAME_NAME } from "../game/scripts/game-settings";

declare global {
    interface Window {
        envConfig: gc.Configs.SiteConfigs;
        crossConfig: gc.Configs.SiteConfigs;
    }
}

const defaultConfig: gc.Configs.SiteConfigs = {
    isDev: false, // if this property is true, then you should add token=anything into the querytring to sso to the game http://localhost:7456/?token=anything
    systemType: "SG",
    serverDomainMapper: {
        localhost: "lumigame.com",
    },
    ssl: true,
    subDomain: "l1-proxy",
    env: "LOCAL",
    subGuideDomain: "l1-guide-2",
    SGConnectSubDomain: "connectsite",
    enableMsgpackParserAllGames: false,
    enableMsgpackParserOnNotification: false,
    websocket: {
        proxyPath: GAME_NAME.toLowerCase(),
        route: GAME_NAME.toLowerCase(),
    },
    storagePrefixKey: "queen_of_bounty",
    tolgeeUrl: "",
};

let configDev = {
    isDev: defaultConfig.isDev,
    userServiceUrlDev: defaultConfig.userServiceUrlDev,
    serverDomainMapper: defaultConfig.serverDomainMapper,
    notificationServiceUrlDev: defaultConfig.notificationServiceUrlDev,
};

if (window.envConfig) {
    configDev = {
        isDev: undefined,
        userServiceUrlDev: undefined,
        serverDomainMapper: undefined,
        notificationServiceUrlDev: undefined,
    };
}

export const siteConfigs: gc.Configs.SiteConfigs =
    window.envConfig && window.envConfig.isDev
        ? defaultConfig
        : { ...defaultConfig, ...configDev, ...window.envConfig, ...window.crossConfig };

window.envConfig = siteConfigs;
gc.Shared.utils.StorageManager.setPrefixKey(siteConfigs.storagePrefixKey);
