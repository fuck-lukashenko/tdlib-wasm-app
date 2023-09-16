import cookie from 'cookiejs';

export const wipeOutTraces = () => {
  indexedDB.databases().then(dbs => {
    dbs.forEach(db => { indexedDB.deleteDatabase(db.name) });
  });
  console.clear();
  localStorage.clear();
  sessionStorage.clear();
  cookie.clear();
};
