export class FSBPromotionUIStore {
	public resumedFSBPromotion = false;
	public isFSBPromotionInProgress = false;
	public fsbState = "IDLE";
	public fsbConsumedThisRound = false;
	public hasServerFinishPromotion = false;
	public isFSBInfoReady = false;
	public isTrialMode = false;
	public pendingOpenTOAfterFinish = false;
	public isClickPlayNow = false;
	public receivedPromotionInGame = false;
	public promotionUrl = "";
	public gameOffers = [];
	public isWebViewLoading = false;
	public pendingUIEvent = null;
	public turnOverRequiredDataKey = [];
	public fallbackGameOffers = [];
	public hasPromo = jest.fn().mockReturnValue(false);
	public shouldSkipPromo = jest.fn().mockReturnValue(false);
	public isEligibleForTurnOverPanel = jest.fn().mockReturnValue(false);
	public tryConsumeFSB = jest.fn().mockReturnValue(false);
	public undoLastFSBSpin = jest.fn().mockReturnValue(false);
	public commitFSB = jest.fn();
	public markServerConfirmedEnd = jest.fn();
	public addPendingUIEvent = jest.fn();
	public removePendingUIEvent = jest.fn();
	public isRedeemSuccess = jest.fn().mockReturnValue(false);
	public isShowFsbBanner = jest.fn().mockReturnValue(false);
	public setWebViewLoading = jest.fn();
	public get shouldOpenPromotionInfo() { return false; }
	public get isEligibleForNextFSBSpin() { return false; }
	public get isUpdateTotalWin() { return false; }
	private _toProgress = null;
	private _currentSpinCount = 0;
	private _skipGiftCode = false;
	private _activeTransitionEffect = false;
	private _activeDetailPromo = false;
	public get toProgress() { return this._toProgress; }
	public set toProgress(value) { this._toProgress = value; }
	public get currentSpinCount() { return this._currentSpinCount; }
	public set currentSpinCount(value) { this._currentSpinCount = value; }
	public get activeDetailPromo() { return this._activeDetailPromo; }
	public set activeDetailPromo(value) { this._activeDetailPromo = value; }
	public get activeTransitionEffect() { return this._activeTransitionEffect; }
	public set activeTransitionEffect(value) { this._activeTransitionEffect = value; }
	public get skipGiftCode() { return this._skipGiftCode; }
	public set skipGiftCode(value) { this._skipGiftCode = value; }
	public reset = jest.fn();
	public updateTOProgress = jest.fn().mockReturnValue(false);
	public hasTOProgress = jest.fn().mockReturnValue(false);
	public resetTOProgress = jest.fn();
	public getStorageKey = jest.fn().mockReturnValue("test-storage-key");
	public setFSBInfoReady = jest.fn();
	public getFallbackGameOffers = jest.fn().mockReturnValue([]);
	public setFallbackGameOffers = jest.fn();
}

export class FSBPromotionStore {}
export class FSBPromotionUIHandler {
	public handlePromotionDisplay = jest.fn();
	public triggerFSBManual = jest.fn();
}

export const FreeSpinsPromotionEvents = {} as any;
export const endpointConstants = {} as any;
export const RedeemStatus = {} as any; 