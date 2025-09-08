import Observer from "observer";

import { _decorator } from "cc";
import { CascadingSlotGame } from "db://shared-cascading-slot/cascading-slot-game";
import { startGame } from "db://shared-components/shared/scripts/startup";
import { siteConfigs } from "../../../scripts/site-configs";
import { containerOptions } from "../containerOptions";
import { settings } from "../game-settings";
import "./../../../resources/i18n";
import { CascadingUIStore } from "db://shared-cascading-slot/index";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import { AudioIds } from "../../audios/AudioIds";
import { globalEmitter, resourcesCache, SlotClientEvent } from "db://shared-cascading-slot/cascading-slot-utils";

startGame(settings.name, containerOptions, siteConfigs, settings.tolgeeNamespaces);

const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;

@ccclass
@observer(settings.name)
export default class Game extends CascadingSlotGame {
    namespace = settings.name;
    private gameConfig: any;
    onLoad() {
        super.onLoad();
        this.gameConfig = resourcesCache.gameFeatures;
        if (this.gameConfig.effectIntroMultiplier) {
            globalEmitter.on(SlotClientEvent.EFFECT_INTRO_MULTIPLIER, this.playAnimMultiplierLand, this);
        }
    }

    @render(CascadingUIStore, (store) => store.haveBigWin)
    async renderHaveBigWin(haveBigWin: boolean) {
        if (haveBigWin) {
            AudioUtils.playSFX(AudioIds.GUN_2_SHOT);
        }
    }
    @render(CascadingUIStore, (store) => store.isShowFreeSpinEffect)
    async renderIsShowFreeSpinEffect(isShowFreeSpinEffect: boolean) {
        if (isShowFreeSpinEffect) {
            AudioUtils.playSFX(AudioIds.GUN_3_SHOT);
        }
    }

    playAnimMultiplierLand() {
        AudioUtils.playSFX(AudioIds.MULTIPLIER);
    }

}
