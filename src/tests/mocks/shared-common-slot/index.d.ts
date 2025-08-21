declare module "db://shared-common-slot/index" {
    export class FSBPromotionUIStore {
        isFSBPromotionInProgress: boolean;
        resumedFSBPromotion: boolean;
        constructor();
    }
    
    export class FSBPromotionUIHandler {
        triggerFSBManual(): void;
        constructor();
    }
    
    export const FEATURE_NAME: string;
    export const defaultFeatures: any[];
}
