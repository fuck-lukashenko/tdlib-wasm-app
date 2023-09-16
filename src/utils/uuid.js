import getUuidFromString from 'uuid-by-string';

export const getUuid = (object = {}) => {
  const string = JSON.stringify(object);

  return getUuidFromString(string);
};

export const getRandomUuid = (object = {}) => (
  getUuid({
    ...object,
    random1: new Date().getTime(),
    random2: Math.random(),
  })
);
