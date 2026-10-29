import pytest
from fastapi import HTTPException

from app.main import app
from app.routes.aws import troubleshooting_lab, troubleshooting_labs
from app.services.aws_troubleshooting import get_aws_troubleshooting_labs


def test_twelve_labs_have_complete_references_and_progressive_diagnostics() -> None:
    labs = get_aws_troubleshooting_labs()
    assert len(labs) == 12
    assert len({lab.slug for lab in labs}) == 12
    for lab in labs:
        evidence_ids = {item.id for item in lab.evidence}
        assert lab.symptoms and lab.remediation and lab.verification and lab.interview_takeaways
        assert len(lab.diagnostic_steps) >= 3
        assert all(set(step.evidence_ids) <= evidence_ids and step.hint for step in lab.diagnostic_steps)
        assert all(sum(option.correct for option in step.options) == 1 for step in lab.diagnostic_steps)
        assert any(option.id == lab.root_cause_id and option.correct for option in lab.root_cause_options)
        assert all(item.content.strip() for item in lab.evidence)


def test_lab_routes_and_references_resolve() -> None:
    items = troubleshooting_labs()
    assert len(items) == 12
    assert troubleshooting_lab("ec2-ssh-connection-failures").id == "aws-lab-01"
    assert "/api/aws/troubleshooting/labs" in app.openapi()["paths"]
    assert "/api/aws/troubleshooting/labs/{slug}" in app.openapi()["paths"]
    with pytest.raises(HTTPException) as error:
        troubleshooting_lab("missing-lab")
    assert error.value.status_code == 404
