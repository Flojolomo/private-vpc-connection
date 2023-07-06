# EC2 connect to private instance

Imagine the following scenario: You have a EC2 instance launched in an isolated subnet of a VPC. Meaning, that there is no access from the internet to the EC2 instance and no, or only limited access of the EC2 instance to the internet. But there is the requirement to be able to connect to the EC2 instance.

To enable this, you require
* An EC2 instance in an isolated subnet
* Interface Endpoints connected to the subnet(s)
* Allow ingress traffic on port 443
* Allow egress traffic on port 443

When setting this up according to the documentation ([link](https://repost.aws/knowledge-center/ec2-systems-manager-vpc-endpoints)), it could not connect to the instance or the console did not show text. There reasons were a missing egress rule for port 443 and that `privateDnsEnabled` is required to be `true` on the `InterfaceVpcEndpoint` when instantiating.
CDK by default creates the rules for ingress traffic. Hence, this is implicitly solved by tooling.
