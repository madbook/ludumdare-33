
const {random, floor} = Math;

export default function dieRoll(n) {
  return floor(random() * n) + 1;
}
