export default function reduceTo2DArray<T>(arr: Array<T>) {
    const result = [];
    for (let i = 0; i < arr.length; i += 2) {
        result.push(arr.slice(i, i + 2));
    }
    return result;
}
