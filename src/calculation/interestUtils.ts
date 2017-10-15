export default class InterestUtils {
    static compoundContinuously =
    (pv: number, i: number, numMonths: number): number =>
        pv * Math.exp(i * numMonths / 12)
}