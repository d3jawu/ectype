const option = (T) =>
  variant({
    Some: T,
    None: Null,
  });

export { option };
