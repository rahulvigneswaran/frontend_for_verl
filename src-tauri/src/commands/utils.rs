pub fn expand_tilde(path: &str) -> String {
    if path.starts_with("~/") {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_default();
        if !home.is_empty() {
            return format!("{}{}", home.trim_end_matches('/'), &path[1..]);
        }
    } else if path == "~" {
        return std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| path.to_string());
    }
    path.to_string()
}
