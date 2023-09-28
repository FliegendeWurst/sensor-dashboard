use rusqlite::Connection;

fn main() {
	let db = Connection::open("sensors.db").unwrap();
	let mut get_values = db.prepare("SELECT time,celsius,humidity FROM sensor_readings ORDER BY time ASC").unwrap();
	let mut values = get_values
		.query_map([], |row| Ok((row.get(0).unwrap(), row.get(1).unwrap(), row.get(2).unwrap(), true)))
		.unwrap()
		.map(Result::unwrap)
		.collect::<Vec<(i64, i64, i64, bool)>>();
	values[0].3 = false;
	// exclude clearly wrong values
	let window_size = 8;
	for i in window_size..values.len() {
		let avg = values[i-window_size..i].iter().map(|x| x.1).sum::<i64>() / window_size as i64;
		if avg.abs_diff(values[i].1) >= 40 && (i == 0 || values[i].0 - values[i-1].0 < 5000000) && i < values.len() - 5 {
			values[i].3 = false;
		}
	}
	// exclude outliers (> X °C diff and not between consecutive values)
	// remember, measurements are done once every 10 minutes
	// it is unlikely the temp. will sway by 1.9 °C in that timeframe
	windows_mut_each(&mut values, 3, |vars| {
		if vars[1].0 - vars[0].0 >= 5000000 { // keep measurements after long gaps
			return;
		}
		// spike up
		if vars[1].1.abs_diff(vars[0].1) >= 19 && vars[1].1 > vars[0].1 && vars[1].1 > vars[2].1 {
			vars[1].3 = false;
		}
		// spike down
		if vars[1].1.abs_diff(vars[0].1) >= 19 && vars[1].1 < vars[0].1 && vars[1].1 < vars[2].1 {
			vars[1].3 = false;
		}
		// check for humidity too
		if vars[1].2.abs_diff(vars[0].2) >= 30 && vars[1].2.abs_diff(vars[2].2) >= 30 {
			vars[1].3 = false;
		}
	});
	println!("time,humidity,celsius"); // ,abs_humidity
	for (time, celsius, rh, keep) in values {
		if keep {
			//let t = celsius as f64 / 10.0;
			//let ah = (6.112 * E.powf((17.67 * t)/(t + 243.5)) * (rh as f64 * 10.0) * 2.1674) / (273.15 + t);
			println!("{},{},{}", time, rh, celsius);//, ah);
		}
	}
}

// https://users.rust-lang.org/t/iterator-over-mutable-windows-of-slice/17110/6
fn windows_mut_each<T>(v: &mut [T], n: usize, mut f: impl FnMut(&mut [T])) {
	let mut start = 0;
	let mut end = n;
	while end <= v.len()  {
		f(&mut v[start..end]);
		start += 1;
		end += 1;
	}
}