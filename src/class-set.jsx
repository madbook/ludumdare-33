
export default function classSet(obj) {
  let res = '';

  for (let key in obj) {
    if (obj[key]) {
      res += key + ' ';
    }
  }

  return res;
}