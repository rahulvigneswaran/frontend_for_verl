use crate::models::job::MetricsSnapshot;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct WandbRun {
    pub id: String,
    pub name: String,
    pub state: String,
    pub project: String,
    pub created_at: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct WandbRunsResponse {
    runs: Vec<WandbRunRaw>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WandbRunRaw {
    id: String,
    name: String,
    state: String,
    project: WandbProject,
    #[serde(rename = "createdAt")]
    created_at: String,
    url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WandbProject {
    name: String,
}

#[tauri::command]
pub async fn fetch_wandb_runs(
    api_key: String,
    entity: String,
    project: String,
) -> Result<Vec<WandbRun>, String> {
    let url = format!(
        "https://api.wandb.ai/api/v1/runs?entity={}&project={}",
        entity, project
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("W&B API request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("W&B API error: {}", response.status()));
    }

    let data: serde_json::Value =
        response.json().await.map_err(|e| format!("Failed to parse W&B response: {e}"))?;

    let runs = data["runs"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|r| WandbRun {
            id: r["id"].as_str().unwrap_or("").to_string(),
            name: r["name"].as_str().unwrap_or("").to_string(),
            state: r["state"].as_str().unwrap_or("unknown").to_string(),
            project: r["project"]["name"].as_str().unwrap_or("").to_string(),
            created_at: r["createdAt"].as_str().unwrap_or("").to_string(),
            url: r["url"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(runs)
}

#[tauri::command]
pub async fn poll_wandb_metrics(
    api_key: String,
    entity: String,
    project: String,
    run_id: String,
    job_id: String,
    last_step: Option<u64>,
) -> Result<Vec<MetricsSnapshot>, String> {
    let url = format!(
        "https://api.wandb.ai/api/v1/runs/{}/{}/{}/history",
        entity, project, run_id
    );

    let client = reqwest::Client::new();
    let mut req = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .query(&[("samples", "1000")]);

    if let Some(step) = last_step {
        req = req.query(&[("minStep", step.to_string())]);
    }

    let response = req.send().await.map_err(|e| format!("W&B metrics request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("W&B metrics API error: {}", response.status()));
    }

    let data: serde_json::Value =
        response.json().await.map_err(|e| format!("Failed to parse metrics: {e}"))?;

    let snapshots = data
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|row| {
            let step = row["_step"].as_u64()?;
            let mut metrics = HashMap::new();

            for (key, val) in row.as_object()? {
                if !key.starts_with('_') {
                    if let Some(v) = val.as_f64() {
                        metrics.insert(key.clone(), v);
                    }
                }
            }

            Some(MetricsSnapshot {
                job_id: job_id.clone(),
                step,
                epoch: row["epoch"].as_f64(),
                metrics,
                timestamp: Utc::now(),
            })
        })
        .collect();

    Ok(snapshots)
}

#[tauri::command]
pub async fn parse_tensorboard_events(log_dir: String) -> Result<Vec<MetricsSnapshot>, String> {
    // Scan for tfevents files and extract scalar summaries.
    // Full protobuf parsing is heavy; we delegate to a small Python helper
    // that writes JSON to stdout, which we parse here.
    let output = tokio::process::Command::new("python3")
        .args([
            "-c",
            &format!(
                r#"
import json, sys
try:
    from tensorboard.backend.event_processing import event_accumulator
    ea = event_accumulator.EventAccumulator("{log_dir}")
    ea.Reload()
    result = []
    for tag in ea.Tags().get('scalars', []):
        for ev in ea.Scalars(tag):
            result.append({{"step": ev.step, "tag": tag, "value": ev.value}})
    print(json.dumps(result))
except Exception as e:
    print(json.dumps([]), file=sys.stdout)
"#
            ),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run tensorboard parser: {e}"))?;

    let raw: Vec<serde_json::Value> =
        serde_json::from_slice(&output.stdout).unwrap_or_default();

    // Group by step
    let mut by_step: HashMap<u64, HashMap<String, f64>> = HashMap::new();
    for ev in &raw {
        let step = ev["step"].as_u64().unwrap_or(0);
        let tag = ev["tag"].as_str().unwrap_or("").to_string();
        let value = ev["value"].as_f64().unwrap_or(0.0);
        by_step.entry(step).or_default().insert(tag, value);
    }

    let mut snapshots: Vec<MetricsSnapshot> = by_step
        .into_iter()
        .map(|(step, metrics)| MetricsSnapshot {
            job_id: log_dir.clone(),
            step,
            epoch: None,
            metrics,
            timestamp: Utc::now(),
        })
        .collect();

    snapshots.sort_by_key(|s| s.step);
    Ok(snapshots)
}
